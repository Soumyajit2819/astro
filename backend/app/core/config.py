from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Cosmic Institute API"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/astro"
    frontend_url: str = "http://localhost:3000"
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    resend_api_key: str = ""
    email_from: str = "noreply@cosmicinstitute.com"
    admin_notification_email: str = "admin@cosmicinstitute.com"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
