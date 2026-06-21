from __future__ import annotations

import operator
import os
import subprocess
import sys
import threading
import time
from os.path import getsize, join
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain.messages import AnyMessage, HumanMessage, SystemMessage, ToolMessage
from langchain.tools import tool
from langgraph.graph import END, START, StateGraph
from typing_extensions import Annotated, TypedDict


load_dotenv()
KEY = os.getenv("GEMINI")

DEFAULT_TARGET_DIR = Path.cwd()
TARGET_DIR = DEFAULT_TARGET_DIR.resolve()
SPINNER_FRAMES = ("|", "/", "-", "\\")

model = init_chat_model("google_genai:gemini-2.5-flash",temperature=0,api_key=KEY,)


def resolve_path(path: str | None = None) -> Path:
    """Resolve relative paths against the current target directory."""
    if not path or path.strip() in {".", ""}:
        return TARGET_DIR

    candidate = Path(path).expanduser()
    if not candidate.is_absolute():
        candidate = TARGET_DIR / candidate
    return candidate.resolve()


@tool
def set_target_dir(path: str) -> str:
    """Set the working directory for future file operations."""
    global TARGET_DIR

    target = resolve_path(path)
    if not target.exists():
        return f"Directory does not exist: {target}"
    if not target.is_dir():
        return f"Path is not a directory: {target}"

    TARGET_DIR = target
    return f"Target directory set to: {TARGET_DIR}"


@tool
def scan_dir(path: str = ".") -> str:
    """List files under a directory with basic sizes."""
    target = resolve_path(path)
    if not target.exists():
        return f"Directory does not exist: {target}"
    if not target.is_dir():
        return f"Path is not a directory: {target}"

    lines: list[str] = [f"Scanning: {target}"]
    for root, dirs, files in os.walk(target):
        dirs[:] = [
            d for d in dirs if d not in ("__pycache__", ".venv", ".git", "node_modules")
        ]

        total_size = 0
        for name in files:
            try:
                total_size += getsize(join(root, name))
            except (FileNotFoundError, PermissionError):
                pass

        lines.append(f"\n{root} consumes {total_size} bytes in {len(files)} files.")
        for name in files:
            file_path = join(root, name)
            try:
                file_size = getsize(file_path)
                lines.append(f"  File: {name} ({file_size} bytes)")
            except (FileNotFoundError, PermissionError):
                lines.append(f"  File: {name} (error reading file size)")

    return "\n".join(lines)


@tool
def read_file(path: str) -> str:
    """Read a text file and return its contents."""
    target = resolve_path(path)
    if not target.exists():
        return f"File does not exist: {target}"
    if not target.is_file():
        return f"Path is not a file: {target}"

    try:
        return target.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return target.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return f"Could not read {target}: {exc}"


@tool
def write_file(path: str, data: str) -> str:
    """Create or overwrite a text file."""
    target = resolve_path(path)
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(data, encoding="utf-8")
    except OSError as exc:
        return f"Could not write {target}: {exc}"

    return f"Wrote {len(data)} characters to {target}"


@tool
def run_python_script(script_path: str) -> str:
    """Run a Python script and return stdout/stderr."""
    target = resolve_path(script_path)
    if not target.exists():
        return f"Script does not exist: {target}"
    if not target.is_file():
        return f"Path is not a file: {target}"

    result = subprocess.run(
        [sys.executable, str(target)],
        cwd=str(TARGET_DIR),
        capture_output=True,
        text=True,
    )

    output = []
    output.append(f"Exit code: {result.returncode}")
    if result.stdout:
        output.append(f"STDOUT:\n{result.stdout}")
    if result.stderr:
        output.append(f"STDERR:\n{result.stderr}")
    return "\n\n".join(output)


tools = [set_target_dir, scan_dir, read_file, write_file, run_python_script]
tools_by_name = {tool.name: tool for tool in tools}
model_with_tools = model.bind_tools(tools)


class MessagesState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    llm_calls: int


def llm_call(state: MessagesState) -> dict:
    """Ask the LLM to either answer or call a tool."""
    system_prompt = f"""
You are a coding agent that can inspect and modify files.

Current target directory: {TARGET_DIR}

Rules:
- Use the current target directory unless the user explicitly gives another directory.
- For file tasks, inspect relevant files before editing.
- Use read_file to read files, write_file to create or overwrite files, and scan_dir to inspect directories.
- If the user asks to change the working directory, call set_target_dir first.
- Keep final answers concise and mention which files were changed.
""".strip()

    return {
        "messages": [
            model_with_tools.invoke(
                [SystemMessage(content=system_prompt)] + state["messages"]
            )
        ],
        "llm_calls": state.get("llm_calls", 0) + 1,
    }


def tool_node(state: MessagesState) -> dict:
    """Perform tool calls requested by the LLM."""
    result = []
    for tool_call in state["messages"][-1].tool_calls:
        selected_tool = tools_by_name[tool_call["name"]]
        observation = selected_tool.invoke(tool_call["args"])
        result.append(
            ToolMessage(content=str(observation), tool_call_id=tool_call["id"])
        )
    return {"messages": result}


def should_continue(state: MessagesState) -> Literal["tool_node", "__end__"]:
    """Continue while the LLM is asking to use tools."""
    messages = state["messages"]
    last_message = messages[-1]

    if last_message.tool_calls:
        return "tool_node"

    return END


agent_builder = StateGraph(MessagesState)
agent_builder.add_node("llm_call", llm_call)
agent_builder.add_node("tool_node", tool_node)
agent_builder.add_edge(START, "llm_call")
agent_builder.add_conditional_edges("llm_call", should_continue, ["tool_node", END])
agent_builder.add_edge("tool_node", "llm_call")
agent = agent_builder.compile()


def run_agent_task(task: str, history: list[AnyMessage] | None = None) -> list[AnyMessage]:
    """Run one user task and return the updated message history."""
    messages = list(history or [])
    messages.append(HumanMessage(content=task))
    result = agent.invoke({"messages": messages, "llm_calls": 0})
    return result["messages"]


def supports_color() -> bool:
    return sys.stdout.isatty() and os.getenv("NO_COLOR") is None


def color(text: str, code: str) -> str:
    if not supports_color():
        return text
    return f"\033[{code}m{text}\033[0m"


def dim(text: str) -> str:
    return color(text, "2")


def cyan(text: str) -> str:
    return color(text, "36")


def green(text: str) -> str:
    return color(text, "32")


def yellow(text: str) -> str:
    return color(text, "33")


class Spinner:
    def __init__(self, message: str = "thinking") -> None:
        self.message = message
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._spin, daemon=True)

    def __enter__(self) -> "Spinner":
        if sys.stdout.isatty():
            self._thread.start()
        else:
            print(f"{self.message}...")
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        self._stop.set()
        if sys.stdout.isatty():
            self._thread.join()
            sys.stdout.write("\r" + " " * (len(self.message) + 8) + "\r")
            sys.stdout.flush()

    def _spin(self) -> None:
        index = 0
        while not self._stop.is_set():
            frame = SPINNER_FRAMES[index % len(SPINNER_FRAMES)]
            sys.stdout.write(f"\r{cyan(frame)} {dim(self.message)}")
            sys.stdout.flush()
            index += 1
            time.sleep(0.12)


def print_banner() -> None:
    title = "Coding Agent"
    print()
    print(cyan(title))
    print(dim("-" * len(title)))
    print(f"{dim('target')} {TARGET_DIR}")
    print(dim("type a task, /help, /pwd, /cd <path>, /clear, or /exit"))
    print()


def print_help() -> None:
    print()
    print(cyan("Commands"))
    print("  /help        show this help")
    print("  /pwd         show the current target directory")
    print("  /cd <path>   change the target directory")
    print("  /clear       clear the conversation history")
    print("  /exit        quit")
    print()


def handle_command(task: str, history: list[AnyMessage]) -> tuple[bool, list[AnyMessage]]:
    global TARGET_DIR

    command, _, value = task.partition(" ")
    command = command.lower()
    value = value.strip()

    if command in {"/exit", "/quit"}:
        print(green("Goodbye."))
        raise SystemExit(0)

    if command == "/help":
        print_help()
        return True, history

    if command == "/pwd":
        print(f"{dim('target')} {TARGET_DIR}\n")
        return True, history

    if command == "/clear":
        print(yellow("Conversation history cleared.\n"))
        return True, []

    if command == "/cd":
        if not value:
            print(yellow("Usage: /cd <path>\n"))
            return True, history

        target = resolve_path(value)
        if not target.exists():
            print(yellow(f"Directory does not exist: {target}\n"))
            return True, history
        if not target.is_dir():
            print(yellow(f"Path is not a directory: {target}\n"))
            return True, history

        TARGET_DIR = target
        print(f"{dim('target')} {TARGET_DIR}\n")
        return True, history

    return False, history


def main() -> None:
    print_banner()

    history: list[AnyMessage] = []
    while True:
        try:
            task = input(cyan("you") + dim(" > ")).strip()
        except (EOFError, KeyboardInterrupt):
            print(f"\n{green('Goodbye.')}")
            break

        if not task:
            continue

        if task.lower() in {"exit", "quit"}:
            task = "/exit"

        handled, history = handle_command(task, history) if task.startswith("/") else (False, history)
        if handled:
            continue

        with Spinner("working"):
            history = run_agent_task(task, history)

        final_message = history[-1]
        print(f"{green('agent')} {dim('>')} {final_message.content}\n")


if __name__ == "__main__":
    main()
