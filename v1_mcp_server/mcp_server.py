from pathlib import Path

from mcp.server.fastmcp import FastMCP

from google_tools import (
    create_calendar_event,
    create_gmail_draft,
    delete_calendar_event,
    list_calendar_events,
    read_drive_file,
    read_gmail_message,
    search_drive_files,
    search_gmail_messages,
    send_gmail_message,
    update_calendar_event,
)
from memory import add_memory, search_memory, summarize_memory


mcp = FastMCP("google-memory-agent-server")
PROJECT_ROOT = Path(__file__).parent.resolve()


@mcp.tool()
def calendar_list_events(days: int = 7) -> str:
    """List upcoming Google Calendar events."""
    return list_calendar_events(days)


@mcp.tool()
def calendar_create_event(
    title: str,
    start_iso: str,
    end_iso: str,
    description: str | None = None,
    location: str | None = None,
) -> str:
    """Create a Google Calendar event."""
    return create_calendar_event(title, start_iso, end_iso, description, location)


@mcp.tool()
def calendar_update_event(
    event_id: str,
    title: str | None = None,
    start_iso: str | None = None,
    end_iso: str | None = None,
    description: str | None = None,
    location: str | None = None,
) -> str:
    """Update an existing Google Calendar event."""
    return update_calendar_event(event_id, title, start_iso, end_iso, description, location)


@mcp.tool()
def calendar_delete_event(event_id: str) -> str:
    """Delete a Google Calendar event."""
    return delete_calendar_event(event_id)


@mcp.tool()
def gmail_search_messages(query: str, max_results: int = 10) -> str:
    """Search Gmail messages using Gmail search syntax."""
    return search_gmail_messages(query, max_results)


@mcp.tool()
def gmail_read_message(message_id: str) -> str:
    """Read a Gmail message by ID."""
    return read_gmail_message(message_id)


@mcp.tool()
def gmail_create_draft(to: str, subject: str, body: str) -> str:
    """Create a Gmail draft."""
    return create_gmail_draft(to, subject, body)


@mcp.tool()
def gmail_send_message(to: str, subject: str, body: str) -> str:
    """Send a Gmail message."""
    return send_gmail_message(to, subject, body)


@mcp.tool()
def drive_search_files(query: str, max_results: int = 10) -> str:
    """Search Google Drive files using Drive query syntax."""
    return search_drive_files(query, max_results)


@mcp.tool()
def drive_read_file(file_id: str) -> str:
    """Read a Google Drive file as text when possible."""
    return read_drive_file(file_id)


@mcp.tool()
def memory_add(text: str, metadata: dict | None = None) -> str:
    """Store a long-term memory."""
    add_memory(text, metadata or {})
    return "Memory stored."


@mcp.tool()
def memory_search(query: str, k: int = 5) -> str:
    """Search long-term memory."""
    return search_memory(query, k)


@mcp.tool()
def memory_summarize(query: str, k: int = 10) -> str:
    """Summarize relevant long-term memories."""
    return summarize_memory(query, k)


@mcp.tool()
def local_read_project_file(relative_path: str) -> str:
    """Read a UTF-8 text file from this project directory."""
    target = (PROJECT_ROOT / relative_path).resolve()
    if not target.is_relative_to(PROJECT_ROOT):
        raise ValueError("Path must stay inside the project directory.")
    if not target.exists() or not target.is_file():
        raise FileNotFoundError(f"No such project file: {relative_path}")
    return target.read_text(encoding="utf-8")


if __name__ == "__main__":
    mcp.run()
