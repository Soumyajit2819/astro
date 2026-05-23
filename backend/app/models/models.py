from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum

from sqlalchemy import JSON, Boolean, Date, DateTime, Enum as SqlEnum, ForeignKey, Numeric, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class BookingStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"


class PaymentStatus(str, Enum):
    created = "created"
    authorized = "authorized"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"


class ScheduleType(str, Enum):
    class_session = "class_session"
    qa_session = "qa_session"
    monthly_test = "monthly_test"


class NotificationType(str, Enum):
    payment_success = "payment_success"
    enrollment = "enrollment"
    reschedule = "reschedule"
    consultation = "consultation"
    announcement = "announcement"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(32))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="user")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")


class Astrologer(Base):
    __tablename__ = "astrologers"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text)
    specialties: Mapped[dict | None] = mapped_column(JSON)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    price_inr: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="service")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    duration_months: Mapped[int] = mapped_column(default=4)
    classes_per_week: Mapped[int] = mapped_column(default=2)

    schedules: Mapped[list["Schedule"]] = relationship(back_populates="course")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    time_of_birth: Mapped[time] = mapped_column(Time, nullable=False)
    place_of_birth: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[BookingStatus] = mapped_column(SqlEnum(BookingStatus), default=BookingStatus.pending)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="bookings")
    service: Mapped["Service"] = relationship(back_populates="bookings")
    payment: Mapped["Payment"] = relationship(back_populates="booking", uselist=False)


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), unique=True, nullable=False)
    razorpay_order_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(255))
    razorpay_signature: Mapped[str | None] = mapped_column(String(255))
    amount_inr: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    status: Mapped[PaymentStatus] = mapped_column(SqlEnum(PaymentStatus), default=PaymentStatus.created)
    gateway_payload: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    booking: Mapped["Booking"] = relationship(back_populates="payment")


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    teacher_name: Mapped[str] = mapped_column(String(32), nullable=False)
    session_type: Mapped[ScheduleType] = mapped_column(SqlEnum(ScheduleType), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    rescheduled_from: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text)

    course: Mapped["Course"] = relationship(back_populates="schedules")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    type: Mapped[NotificationType] = mapped_column(SqlEnum(NotificationType), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="notifications")


class FAQ(Base):
    __tablename__ = "faq"

    id: Mapped[int] = mapped_column(primary_key=True)
    question: Mapped[str] = mapped_column(String(500), nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(100))
