from datetime import datetime

from pydantic import BaseModel


class ScheduleGenerateRequest(BaseModel):
    course_id: int
    course_title: str = "Astrology Mastery"
    start_date: datetime
    class_duration_minutes: int = 90


class ScheduleRescheduleRequest(BaseModel):
    schedule_id: int
    new_start: datetime
    new_end: datetime
