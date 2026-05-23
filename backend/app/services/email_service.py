from pathlib import Path

import resend

from app.core.config import settings

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"


def render_template(template_name: str, **context: str) -> str:
    template = (TEMPLATE_DIR / template_name).read_text()
    return template.format(**context)


def send_email(to_email: str, subject: str, html: str) -> dict:
    if not settings.resend_api_key:
        return {"status": "skipped", "reason": "RESEND_API_KEY not configured"}

    resend.api_key = settings.resend_api_key
    return resend.Emails.send(
        {
            "from": settings.email_from,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
    )
