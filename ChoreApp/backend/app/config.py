from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    pb_url: str = "http://localhost:8090"
    pb_admin_email: str = ""
    pb_admin_password: str = ""

    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_contact_email: str = "mailto:admin@choreapp.local"

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    frontend_url: str = "http://localhost:3000"
    log_level: str = "INFO"


settings = Settings()
