from datetime import date, time

from pydantic import BaseModel, EmailStr


class BookingCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: str
    date_of_birth: date
    time_of_birth: time
    place_of_birth: str
    service_name: str
    message: str | None = None


class RazorpayOrderOut(BaseModel):
    id: str
    amount: int
    currency: str


class BookingResponse(BaseModel):
    id: int
    status: str


class BookingCreateResponse(BaseModel):
    booking: BookingResponse
    razorpay_order: RazorpayOrderOut
