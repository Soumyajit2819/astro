import hashlib
import hmac

import razorpay

from app.core.config import settings


def get_razorpay_client():
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def create_order(amount_inr: float, receipt: str) -> dict:
    client = get_razorpay_client()
    return client.order.create(
        {
            "amount": int(amount_inr * 100),
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
        }
    )


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    payload = f"{order_id}|{payment_id}".encode()
    generated = hmac.new(settings.razorpay_key_secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(generated, signature)


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    generated = hmac.new(settings.razorpay_webhook_secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(generated, signature)
