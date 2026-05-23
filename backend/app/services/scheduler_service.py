from collections import defaultdict
from datetime import datetime, timedelta

from ortools.sat.python import cp_model


TEACHERS = ["A", "B"]
CLASS_DAYS = [1, 4]


def generate_course_schedule(start_date: datetime, class_duration_minutes: int, course_title: str) -> list[dict]:
    total_weeks = 16
    base_slots: list[dict] = []
    class_count = 0

    current = start_date
    while len(base_slots) < total_weeks * 2:
        if current.weekday() in CLASS_DAYS:
            class_count += 1
            starts_at = current.replace(hour=18, minute=0, second=0, microsecond=0)
            ends_at = starts_at + timedelta(minutes=class_duration_minutes)
            base_slots.append(
                {
                    "title": f"{course_title} Class {class_count}",
                    "session_type": "class_session",
                    "starts_at": starts_at,
                    "ends_at": ends_at,
                    "index": class_count,
                }
            )

            if class_count % 5 == 0:
                qa_start = starts_at + timedelta(days=1)
                base_slots.append(
                    {
                        "title": f"{course_title} Q&A {class_count // 5}",
                        "session_type": "qa_session",
                        "starts_at": qa_start,
                        "ends_at": qa_start + timedelta(minutes=60),
                        "index": class_count + 100,
                    }
                )

        if current.day <= 7 and current.weekday() == 6:
            test_start = current.replace(hour=11, minute=0, second=0, microsecond=0)
            base_slots.append(
                {
                    "title": f"{course_title} Monthly Test {current.month}",
                    "session_type": "monthly_test",
                    "starts_at": test_start,
                    "ends_at": test_start + timedelta(minutes=120),
                    "index": class_count + 200 + current.month,
                }
            )

        current += timedelta(days=1)

    model = cp_model.CpModel()
    teacher_vars = {}
    teacher_to_slots = defaultdict(list)

    for slot_index, slot in enumerate(base_slots):
        teacher_var = model.NewIntVar(0, len(TEACHERS) - 1, f"teacher_{slot_index}")
        teacher_vars[slot_index] = teacher_var
        teacher_to_slots[slot["starts_at"]].append(slot_index)

    for simultaneous_slots in teacher_to_slots.values():
        if len(simultaneous_slots) > 1:
            model.AddAllDifferent([teacher_vars[i] for i in simultaneous_slots])

    solver = cp_model.CpSolver()
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise ValueError("No feasible schedule found.")

    schedule = []
    for slot_index, slot in enumerate(sorted(base_slots, key=lambda item: item["starts_at"])):
        schedule.append(
            {
                **slot,
                "teacher_name": TEACHERS[solver.Value(teacher_vars[slot_index])],
            }
        )

    return schedule
