"""Push and email notification service."""
import json
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict

from app.config import settings

logger = logging.getLogger(__name__)


def send_push(subscription: Dict, title: str, body: str, url: str = "/") -> bool:
    """Send a Web Push notification to a single subscription."""
    if not settings.vapid_private_key or not settings.vapid_public_key:
        logger.warning("VAPID keys not configured — skipping push")
        return False

    try:
        from pywebpush import webpush, WebPushException

        webpush(
            subscription_info={
                "endpoint": subscription["endpoint"],
                "keys": {
                    "p256dh": subscription["p256dh"],
                    "auth": subscription["auth"],
                },
            },
            data=json.dumps({"title": title, "body": body, "url": url}),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={
                "sub": settings.vapid_contact_email,
            },
        )
        return True
    except Exception as e:
        logger.error("Push notification failed: %s", e)
        return False


def send_email(to: str, subject: str, body_html: str) -> bool:
    """Send an HTML email via SMTP."""
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP not configured — skipping email")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_user
        msg["To"] = to
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, to, msg.as_string())
        return True
    except Exception as e:
        logger.error("Email send failed to %s: %s", to, e)
        return False


def build_due_soon_email(chore_title: str, due_date: str) -> str:
    return f"""
    <html><body>
    <h2>Chore Due Soon</h2>
    <p>The chore <strong>{chore_title}</strong> is due on <strong>{due_date}</strong>.</p>
    <p>Log in to ChoreApp to mark it complete.</p>
    </body></html>
    """


def build_assigned_email(chore_title: str, assigned_by: str) -> str:
    return f"""
    <html><body>
    <h2>New Chore Assigned</h2>
    <p><strong>{assigned_by}</strong> assigned you the chore: <strong>{chore_title}</strong>.</p>
    <p>Log in to ChoreApp to view the details.</p>
    </body></html>
    """
