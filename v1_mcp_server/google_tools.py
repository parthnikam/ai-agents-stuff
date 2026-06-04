import base64
import io
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload


SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive.readonly",
]

TOKEN_PATH = Path("token.json")
CREDS_PATH = Path("credentials.json")
DEFAULT_TIME_ZONE = "Asia/Kolkata"


def _load_saved_credentials() -> Credentials | None:
    if not TOKEN_PATH.exists() or TOKEN_PATH.stat().st_size == 0:
        return None

    try:
        return Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
    except ValueError:
        return None


def get_credentials() -> Credentials:
    creds = _load_saved_credentials()

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())

    if not creds or not creds.valid:
        if not CREDS_PATH.exists() or CREDS_PATH.stat().st_size == 0:
            raise FileNotFoundError(
                "Missing Google OAuth credentials. Add a valid credentials.json file first."
            )

        flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
        creds = flow.run_local_server(port=0)

    TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
    return creds


def get_google_service(api_name: str, version: str):
    return build(api_name, version, credentials=get_credentials())


def get_calendar_service():
    return get_google_service("calendar", "v3")


def get_gmail_service():
    return get_google_service("gmail", "v1")


def get_drive_service():
    return get_google_service("drive", "v3")


def list_calendar_events(days: int = 7) -> str:
    service = get_calendar_service()

    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days)

    events = service.events().list(
        calendarId="primary",
        timeMin=now.isoformat(),
        timeMax=end.isoformat(),
        singleEvents=True,
        orderBy="startTime",
    ).execute().get("items", [])

    if not events:
        return "No upcoming events."

    lines = []
    for event in events:
        start = event["start"].get("dateTime", event["start"].get("date"))
        lines.append(f"{event['id']} | {start} - {event.get('summary', 'Untitled')}")

    return "\n".join(lines)


def create_calendar_event(
    title: str,
    start_iso: str,
    end_iso: str,
    description: str | None = None,
    location: str | None = None,
) -> str:
    service = get_calendar_service()

    event = {
        "summary": title,
        "start": {"dateTime": start_iso, "timeZone": DEFAULT_TIME_ZONE},
        "end": {"dateTime": end_iso, "timeZone": DEFAULT_TIME_ZONE},
    }
    if description:
        event["description"] = description
    if location:
        event["location"] = location

    created = service.events().insert(calendarId="primary", body=event).execute()
    return f"Created event {created.get('id')}: {created.get('htmlLink')}"


def update_calendar_event(
    event_id: str,
    title: str | None = None,
    start_iso: str | None = None,
    end_iso: str | None = None,
    description: str | None = None,
    location: str | None = None,
) -> str:
    service = get_calendar_service()
    event = service.events().get(calendarId="primary", eventId=event_id).execute()

    if title is not None:
        event["summary"] = title
    if start_iso is not None:
        event["start"] = {"dateTime": start_iso, "timeZone": DEFAULT_TIME_ZONE}
    if end_iso is not None:
        event["end"] = {"dateTime": end_iso, "timeZone": DEFAULT_TIME_ZONE}
    if description is not None:
        event["description"] = description
    if location is not None:
        event["location"] = location

    updated = service.events().update(
        calendarId="primary",
        eventId=event_id,
        body=event,
    ).execute()
    return f"Updated event {updated.get('id')}: {updated.get('htmlLink')}"


def delete_calendar_event(event_id: str) -> str:
    service = get_calendar_service()
    service.events().delete(calendarId="primary", eventId=event_id).execute()
    return f"Deleted event {event_id}."


def search_gmail_messages(query: str, max_results: int = 10) -> str:
    service = get_gmail_service()
    messages = service.users().messages().list(
        userId="me",
        q=query,
        maxResults=max_results,
    ).execute().get("messages", [])

    if not messages:
        return "No matching Gmail messages."

    lines = []
    for message in messages:
        detail = service.users().messages().get(
            userId="me",
            id=message["id"],
            format="metadata",
            metadataHeaders=["From", "Subject", "Date"],
        ).execute()
        headers = {h["name"]: h["value"] for h in detail.get("payload", {}).get("headers", [])}
        subject = headers.get("Subject", "(no subject)")
        sender = headers.get("From", "(unknown sender)")
        date = headers.get("Date", "(unknown date)")
        lines.append(f"{message['id']} | {date} | {sender} | {subject}")

    return "\n".join(lines)


def read_gmail_message(message_id: str) -> str:
    service = get_gmail_service()
    message = service.users().messages().get(
        userId="me",
        id=message_id,
        format="full",
    ).execute()

    headers = {h["name"]: h["value"] for h in message.get("payload", {}).get("headers", [])}
    snippet = message.get("snippet", "")
    return "\n".join([
        f"From: {headers.get('From', '(unknown sender)')}",
        f"To: {headers.get('To', '(unknown recipient)')}",
        f"Date: {headers.get('Date', '(unknown date)')}",
        f"Subject: {headers.get('Subject', '(no subject)')}",
        "",
        snippet,
    ])


def _build_email(to: str, subject: str, body: str) -> dict:
    message = EmailMessage()
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    encoded = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    return {"raw": encoded}


def create_gmail_draft(to: str, subject: str, body: str) -> str:
    service = get_gmail_service()
    draft = service.users().drafts().create(
        userId="me",
        body={"message": _build_email(to, subject, body)},
    ).execute()
    return f"Created Gmail draft {draft.get('id')}."


def send_gmail_message(to: str, subject: str, body: str) -> str:
    service = get_gmail_service()
    sent = service.users().messages().send(
        userId="me",
        body=_build_email(to, subject, body),
    ).execute()
    return f"Sent Gmail message {sent.get('id')}."


def search_drive_files(query: str, max_results: int = 10) -> str:
    service = get_drive_service()
    response = service.files().list(
        q=query,
        pageSize=max_results,
        fields="files(id, name, mimeType, modifiedTime, webViewLink)",
    ).execute()
    files = response.get("files", [])

    if not files:
        return "No matching Drive files."

    return "\n".join(
        f"{file['id']} | {file.get('modifiedTime', 'unknown')} | "
        f"{file.get('mimeType', 'unknown')} | {file.get('name', 'Untitled')} | "
        f"{file.get('webViewLink', '')}"
        for file in files
    )


def read_drive_file(file_id: str) -> str:
    service = get_drive_service()
    metadata = service.files().get(
        fileId=file_id,
        fields="id, name, mimeType",
    ).execute()
    mime_type = metadata.get("mimeType", "")

    if mime_type.startswith("application/vnd.google-apps."):
        request = service.files().export_media(fileId=file_id, mimeType="text/plain")
    else:
        request = service.files().get_media(fileId=file_id)

    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()

    text = buffer.getvalue().decode("utf-8", errors="replace")
    return f"{metadata.get('name', 'Untitled')}\n\n{text}"
