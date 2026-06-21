import chromadb
from sentence_transformers import SentenceTransformer
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4
from datetime import datetime




class LongTermMemory:
    def __init__(self, path: str = "./chroma_db"):
        self.client = chromadb.PersistentClient(path=path)
        self.collection = self.client.get_or_create_collection("agent_memory")
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")


    def add_memory(self, text: str, metadata: dict | None = None):
        metadata = metadata or {}
        metadata["created_at"] = datetime.now().isoformat()
        embedding = self.embedder.encode(text).tolist()

        self.collection.add(
            ids=[str(uuid4())],
            documents=[text],
            embeddings=[embedding],
            metadatas=[metadata]
        )


    def search_memory(self, query: str, k: int=5) -> list[str]:
        query_embedding = self.embedder.encode(query).tolist()
        results = self.collection.query(query_embeddings=[query_embedding], n_results=k)
<<<<<<< HEAD
        
=======

>>>>>>> 7e321c1226411851244a847c725238925c734f39
        docs = results.get("documents", [[]])[0]
        if not docs: return "No relevant memory found."
        
        return "\n\n".join(docs)


_long_term_memory: LongTermMemory | None = None


def get_long_term_memory() -> LongTermMemory:
    global _long_term_memory
    if _long_term_memory is None:
        _long_term_memory = LongTermMemory()
    return _long_term_memory


def add_memory(text: str, metadata: dict | None = None) -> None:
    get_long_term_memory().add_memory(text, metadata)


def search_memory(query: str, k: int = 5) -> str:
    return get_long_term_memory().search_memory(query, k)


def summarize_memory(query: str, k: int = 10) -> str:
    memories = search_memory(query, k)
    if memories == "No relevant memory found.":
        return memories

    lines = [line.strip() for line in memories.splitlines() if line.strip()]
    summary_lines = lines[: min(5, len(lines))]
    return "Relevant memory summary:\n" + "\n".join(f"- {line}" for line in summary_lines)


class ShortTermMemory:
    def __init__(self, max_messages: int=30):
        self.messages: list[dict] = []
        self.max_messages = max_messages

    def add(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        self.messages = self.messages[-self.max_messages : ] # shifting the context window by discarding the first message

    def get(self) -> list[dict]:
        return self.messages 



"""
Example of Working Memory: 
{
  "task": "email_arjun_notes",
  "goal": "Send Arjun meeting notes and ask about Friday availability",
  "entities": {
    "person": "Arjun",
    "time_reference": "yesterday's meeting",
    "proposed_day": "Friday"
  },
  "missing_info": [
    "Arjun email",
    "meeting notes source"
  ],
  "steps": [
    {"name": "find_contact", "status": "pending"},
    {"name": "find_notes", "status": "pending"},
    {"name": "draft_email", "status": "pending"},
    {"name": "ask_user_approval", "status": "pending"},
    {"name": "send_email", "status": "pending"}
  ]
}
"""


@dataclass 
class WorkingMemory:
    goal: str | None = None
    entities: dict[str, Any] = field(default_factory=dict)
    missing_info: list[str] = field(default_factory=list)
    plan: list[dict[str, str]] = field(default_factory=list)
    tool_results: list[dict[str, Any]] = field(default_factory=list)

    def update_from_dict(self, patch: dict):
        for key, value in patch.items():
            if hasattr(self, key):
                setattr(self, key, value)

    def add_tool_result(self, tool_name: str, result: Any):
        self.tool_results.append({
            "tool": tool_name,
            "result": result,
        })

    def as_prompt_text(self) -> str:
        return f"""
Current working memory:
Goal: {self.goal}
Entities: {self.entities}
Missing info: {self.missing_info}
Plan: {self.plan}
Recent tool results: {self.tool_results[-5:]}
""".strip()
