from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import (
    Astrologer,
    Booking,
    BookingStatus,
    Course,
    FAQ,
    Notification,
    NotificationType,
    Payment,
    PaymentStatus,
    Schedule,
    Service,
    User,
)
from app.schemas.bookings import BookingCreate, BookingCreateResponse
from app.schemas.admin import AnnouncementCreate, AstrologerCreate, CourseCreate, ServiceCreate
from app.schemas.chatbot import ChatbotQuestion
from app.schemas.payments import PaymentVerifyRequest
from app.schemas.schedules import ScheduleGenerateRequest, ScheduleRescheduleRequest
from app.services.chatbot_service import get_best_faq_answer
from app.services.email_service import render_template, send_email
from app.services.payment_service import create_order, verify_signature, verify_webhook_signature
from app.services.scheduler_service import generate_course_schedule

router = APIRouter(prefix="/api")


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.post("/bookings", response_model=BookingCreateResponse, status_code=status.HTTP_201_CREATED)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None:
        user = User(full_name=payload.full_name, email=payload.email, phone_number=payload.phone_number)
        db.add(user)
        db.flush()

    service = db.query(Service).filter(Service.name == payload.service_name).first()
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found.")

    booking = Booking(
        user_id=user.id,
        service_id=service.id,
        date_of_birth=payload.date_of_birth,
        time_of_birth=payload.time_of_birth,
        place_of_birth=payload.place_of_birth,
        message=payload.message,
        status=BookingStatus.pending,
    )
    db.add(booking)
    db.flush()

    order = create_order(float(service.price_inr), f"booking-{booking.id}")
    payment = Payment(
        booking_id=booking.id,
        razorpay_order_id=order["id"],
        amount_inr=Decimal(service.price_inr),
        currency=order["currency"],
        status=PaymentStatus.created,
        gateway_payload=order,
    )
    db.add(payment)
    consultation_html = render_template(
        "consultation.html",
        full_name=user.full_name,
        service_name=service.name,
    )
    send_email(user.email, "Consultation booking received", consultation_html)
    db.add(
        Notification(
            user_id=user.id,
            type=NotificationType.consultation,
            subject="Consultation booking received",
            body_html=consultation_html,
        )
    )
    db.commit()

    return {
        "booking": {"id": booking.id, "status": booking.status.value},
        "razorpay_order": {"id": order["id"], "amount": order["amount"], "currency": order["currency"]},
    }


@router.post("/payments/verify")
def verify_payment(payload: PaymentVerifyRequest, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.booking_id == payload.booking_id).first()
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    if not verify_signature(payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature):
        payment.status = PaymentStatus.failed
        booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
        if booking:
            booking.status = BookingStatus.failed
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid payment signature.")

    payment.razorpay_payment_id = payload.razorpay_payment_id
    payment.razorpay_signature = payload.razorpay_signature
    payment.status = PaymentStatus.paid

    booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")

    booking.status = BookingStatus.paid
    html = render_template(
        "payment_success.html",
        full_name=booking.user.full_name,
        service_name=booking.service.name,
        amount=str(payment.amount_inr),
    )
    send_email(booking.user.email, "Payment confirmed", html)
    db.add(
        Notification(
            user_id=booking.user_id,
            type=NotificationType.payment_success,
            subject="Payment confirmed",
            body_html=html,
        )
    )
    db.commit()
    return {"status": "verified"}


@router.post("/payments/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(default=""),
    db: Session = Depends(get_db),
):
    body = await request.body()
    if not verify_webhook_signature(body, x_razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    payload = await request.json()
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = entity.get("order_id")
    payment_record = db.query(Payment).filter(Payment.razorpay_order_id == order_id).first()
    if payment_record:
        payment_record.gateway_payload = payload
        payment_record.status = PaymentStatus.paid if entity.get("status") == "captured" else PaymentStatus.authorized
        db.commit()

    return {"status": "received"}


@router.post("/chatbot/ask")
def ask_chatbot(payload: ChatbotQuestion, db: Session = Depends(get_db)):
    return get_best_faq_answer(db, payload.question)


@router.post("/schedules/generate")
def build_schedule(payload: ScheduleGenerateRequest, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if course is None:
        course = Course(id=payload.course_id, title=payload.course_title, duration_months=4, classes_per_week=2)
        db.add(course)
        db.flush()

    generated = generate_course_schedule(payload.start_date, payload.class_duration_minutes, payload.course_title)
    for item in generated:
        db.add(
            Schedule(
                course_id=course.id,
                teacher_name=item["teacher_name"],
                session_type=item["session_type"],
                title=item["title"],
                starts_at=item["starts_at"],
                ends_at=item["ends_at"],
            )
        )
    db.commit()
    return {"count": len(generated), "schedule": generated}


@router.post("/schedules/reschedule")
def reschedule_class(payload: ScheduleRescheduleRequest, db: Session = Depends(get_db)):
    schedule = db.query(Schedule).filter(Schedule.id == payload.schedule_id).first()
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found.")

    conflict = (
        db.query(Schedule)
        .filter(
            Schedule.teacher_name == schedule.teacher_name,
            Schedule.id != schedule.id,
            Schedule.starts_at < payload.new_end,
            Schedule.ends_at > payload.new_start,
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=400, detail="Teacher conflict detected for the selected time.")

    original_start = schedule.starts_at
    schedule.rescheduled_from = original_start
    schedule.starts_at = payload.new_start
    schedule.ends_at = payload.new_end

    html = render_template(
        "reschedule.html",
        title=schedule.title,
        old_time=original_start.strftime("%d %b %Y %I:%M %p"),
        new_time=payload.new_start.strftime("%d %b %Y %I:%M %p"),
    )
    send_email("students@cosmicinstitute.com", "Class schedule updated", html)
    db.add(
        Notification(
            type=NotificationType.reschedule,
            subject="Class schedule updated",
            body_html=html,
        )
    )
    db.commit()
    return {"status": "rescheduled"}


@router.get("/admin/summary")
def admin_summary(db: Session = Depends(get_db)):
    return {
        "astrologers": db.query(Astrologer).count(),
        "services": db.query(Service).count(),
        "bookings": db.query(Booking).count(),
        "payments_paid": db.query(Payment).filter(Payment.status == PaymentStatus.paid).count(),
        "last_updated": datetime.utcnow().isoformat(),
    }


@router.post("/admin/astrologers", status_code=status.HTTP_201_CREATED)
def create_astrologer(payload: AstrologerCreate, db: Session = Depends(get_db)):
    astrologer = Astrologer(
        full_name=payload.full_name,
        bio=payload.bio,
        specialties={"items": payload.specialties},
    )
    db.add(astrologer)
    db.commit()
    db.refresh(astrologer)
    return astrologer


@router.post("/admin/services", status_code=status.HTTP_201_CREATED)
def create_service(payload: ServiceCreate, db: Session = Depends(get_db)):
    service = Service(name=payload.name, description=payload.description, price_inr=payload.price_inr)
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.post("/admin/courses", status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    course = Course(
        title=payload.title,
        description=payload.description,
        duration_months=payload.duration_months,
        classes_per_week=payload.classes_per_week,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.post("/admin/announcements")
def send_announcement(payload: AnnouncementCreate, db: Session = Depends(get_db)):
    send_email("students@cosmicinstitute.com", payload.subject, payload.html_body)
    db.add(
        Notification(
            type=NotificationType.announcement,
            subject=payload.subject,
            body_html=payload.html_body,
        )
    )
    db.commit()
    return {"status": "sent"}


@router.post("/courses/{course_id}/enroll")
def enroll_in_course(course_id: int, user_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    user = db.query(User).filter(User.id == user_id).first()
    if course is None or user is None:
        raise HTTPException(status_code=404, detail="Course or user not found.")

    html = render_template(
        "enrollment.html",
        full_name=user.full_name,
        course_title=course.title,
        start_date="As per published schedule",
    )
    send_email(user.email, "Class enrollment confirmed", html)
    db.add(
        Notification(
            user_id=user.id,
            type=NotificationType.enrollment,
            subject="Class enrollment confirmed",
            body_html=html,
        )
    )
    db.commit()
    return {"status": "enrolled"}


@router.get("/seed")
def seed_data(db: Session = Depends(get_db)):
    if db.query(Service).count() == 0:
        db.add_all(
            [
                Service(name="Career Consultation", description="Career direction and timing.", price_inr=201),
                Service(name="Marriage Prediction", description="Relationship compatibility and timing.", price_inr=501),
                Service(name="Full Astrology", description="Full birth-chart analysis.", price_inr=701),
                Service(name="Dowsing", description="Energy dowsing consultation.", price_inr=999),
            ]
        )

    if db.query(Astrologer).count() == 0:
        db.add(
            Astrologer(
                full_name="Acharya Anaya Dev",
                bio="Lead astrologer and instructor specializing in Vedic astrology, numerology, and dowsing.",
                specialties={"primary": ["Astrology", "Numerology", "Dowsing"]},
            )
        )

    if db.query(FAQ).count() == 0:
        db.add_all(
            [
                FAQ(question="What is the course duration?", answer="The course runs for 4 months."),
                FAQ(question="How many classes are held weekly?", answer="Two live classes are scheduled every week."),
                FAQ(question="What are the consultation prices?", answer="Consultations range from Rs. 201 to Rs. 999 depending on the service."),
                FAQ(question="Who is the astrologer?", answer="Acharya Anaya Dev leads the institute."),
                FAQ(question="How does payment work?", answer="Bookings create a Razorpay order and payment is verified after checkout."),
                FAQ(question="What services are offered?", answer="Astrology, numerology, dowsing, and structured courses are available."),
            ]
        )

    db.commit()
    return {"status": "seeded"}
