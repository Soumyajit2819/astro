from pydantic import BaseModel


class AstrologerCreate(BaseModel):
    full_name: str
    bio: str
    specialties: list[str]


class ServiceCreate(BaseModel):
    name: str
    description: str
    price_inr: float


class CourseCreate(BaseModel):
    title: str
    description: str
    duration_months: int = 4
    classes_per_week: int = 2


class AnnouncementCreate(BaseModel):
    subject: str
    html_body: str
