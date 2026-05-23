from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from app.models.models import FAQ


def get_best_faq_answer(db: Session, question: str) -> dict:
    faqs = db.query(FAQ).all()
    if not faqs:
        return {"answer": "FAQ data is not available yet.", "matched_question": None, "score": 0.0}

    best_item = None
    best_score = 0.0
    normalized = question.lower()

    for faq in faqs:
        score = SequenceMatcher(None, normalized, faq.question.lower()).ratio()
        if score > best_score:
            best_score = score
            best_item = faq

    if best_item is None or best_score < 0.35:
        return {
            "answer": "I could not find a close FAQ match. Please contact support for detailed help.",
            "matched_question": None,
            "score": best_score,
        }

    return {"answer": best_item.answer, "matched_question": best_item.question, "score": round(best_score, 2)}
