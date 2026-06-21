import asyncio
import json
import os
import sys
from typing import Any

from dotenv import load_dotenv
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from openai import OpenAI

from memory import ShortTermMemory, WorkingMemory


load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_TOOL_ROUNDS = 8


def _mcp_tools_to_openai_tools(mcp_tools: list[Any]) -> list[dict[str, Any]]:
    tools = []
    for tool in mcp_tools:
        tools.append({
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description or "",
                "parameters": tool.inputSchema or {"type": "object", "properties": {}},
            },
        })
    return tools


def _message_to_dict(message: Any) -> dict[str, Any]:
    tool_calls = None
    if message.tool_calls:
        tool_calls = [
            {
                "id": call.id,
                "type": call.type,
                "function": {
                    "name": call.function.name,
                    "arguments": call.function.arguments,
                },
            }
            for call in message.tool_calls
        ]

    payload = {"role": "assistant", "content": message.content or ""}
<<<<<<< HEAD
    
=======
>>>>>>> 7e321c1226411851244a847c725238925c734f39
    if tool_calls:
        payload["tool_calls"] = tool_calls
    return payload


def _tool_result_to_text(result: Any) -> str:
    parts = []
    for item in getattr(result, "content", []):
        text = getattr(item, "text", None)
        if text is not None:
            parts.append(text)

    if parts:
        return "\n".join(parts)

    return str(result)


async def _load_relevant_memory(session: ClientSession, user_input: str) -> str:
    try:
        result = await session.call_tool("memory_search", {"query": user_input, "k": 3})
        return _tool_result_to_text(result)
    except Exception:
        return "No relevant memory loaded."


async def run_agent() -> None:
    if not OPENAI_API_KEY:
        raise RuntimeError("Set OPENAI_API_KEY or OPENAI in .env before running the agent.")

    client = OpenAI(api_key=OPENAI_API_KEY)
    short_term = ShortTermMemory()
    working_memory = WorkingMemory()

    server_params = StdioServerParameters(
        command=sys.executable,
        args=["mcp_server.py"],
    )

    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            mcp_tools = (await session.list_tools()).tools
            openai_tools = _mcp_tools_to_openai_tools(mcp_tools)

            print("Agent ready. Type /quit to exit.")

            while True:
                user_input = input("\nYou: ").strip()
                if user_input.lower() in {"/q", "/quit", "exit"}:
                    break
                if not user_input:
                    continue

                short_term.add("user", user_input)
                relevant_memory = await _load_relevant_memory(session, user_input)

                messages: list[dict[str, Any]] = [
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful local assistant. Use MCP tools when they are useful. "
                            "Ask the user before sending email or deleting calendar events unless they "
                            "explicitly asked for that action.\n\n"
                            f"{working_memory.as_prompt_text()}\n\n"
                            f"Relevant long-term memory:\n{relevant_memory}"
                        ),
                    },
                    *short_term.get(),
                ]

                for _ in range(MAX_TOOL_ROUNDS):
                    response = client.chat.completions.create(
                        model=MODEL,
                        messages=messages,
                        tools=openai_tools,
                        tool_choice="auto",
                        temperature=0,
                    )
                    assistant_message = response.choices[0].message
                    messages.append(_message_to_dict(assistant_message))

                    if not assistant_message.tool_calls:
                        final_text = assistant_message.content or ""
                        short_term.add("assistant", final_text)
                        print(f"\nAgent: {final_text}")
                        break

                    for tool_call in assistant_message.tool_calls:
                        tool_name = tool_call.function.name
                        try:
                            arguments = json.loads(tool_call.function.arguments or "{}")
                            result = await session.call_tool(tool_name, arguments)
                            result_text = _tool_result_to_text(result)
                        except Exception as exc:
                            result_text = f"Tool error: {exc}"

                        working_memory.add_tool_result(tool_name, result_text)
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": result_text,
                        })
                else:
                    print("\nAgent: I hit the tool-call limit for this turn.")


if __name__ == "__main__":
    asyncio.run(run_agent())
