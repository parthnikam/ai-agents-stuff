"""Flan-T5 Small service for natural language chore parsing."""
import json
import re
import logging
from app.models.ai import AIParseResponse

logger = logging.getLogger(__name__)

_pipeline = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        from transformers import pipeline
        logger.info("Loading Flan-T5 Small model...")
        _pipeline = pipeline(
            "text2text-generation",
            model="google/flan-t5-small",
            max_new_tokens=200,
        )
        logger.info("Flan-T5 Small loaded.")
    return _pipeline


IMPORTANCE_MAP = {
    "low": 1, "minor": 1,
    "normal": 3, "medium": 3, "moderate": 3,
    "high": 4, "important": 4, "urgent": 4,
    "critical": 5, "very high": 5, "highest": 5,
}

RECURRENCE_MAP = {
    "daily": "weekly", "every day": "weekly",
    "weekly": "weekly", "every week": "weekly", "biweekly": "weekly",
    "monthly": "monthly", "every month": "monthly",
    "yearly": "yearly", "annually": "yearly", "every year": "yearly",
}

PROMPT_TEMPLATE = """Extract task details from this sentence and respond ONLY in valid JSON with no extra text.
Sentence: "{sentence}"
JSON fields: title (string), recurrence (weekly/monthly/yearly/none), importance (integer 1-5 where 1=low 5=critical), assignees (list of names), project (string or null), due_date (YYYY-MM-DD or null).
JSON:"""


def _fallback_parse(prompt: str, raw: str) -> AIParseResponse:
    title_match = re.match(r"^([^,.!?]+)", prompt.strip())
    title = title_match.group(1).strip() if title_match else prompt.strip()[:60]

    recurrence = "none"
    prompt_lower = prompt.lower()
    for key, val in RECURRENCE_MAP.items():
        if key in prompt_lower:
            recurrence = val
            break

    importance = 3
    for key, val in IMPORTANCE_MAP.items():
        if key in prompt_lower:
            importance = val
            break

    assignees = []
    for match in re.findall(r"assign(?:ed)?\s+to\s+([\w\s,]+?)(?:\.|,|$)", prompt, re.I):
        for name in re.split(r"[,\s]+and\s+|[,\s]+", match):
            name = name.strip()
            if name:
                assignees.append(name)

    return AIParseResponse(
        title=title,
        recurrence=recurrence,
        importance=importance,
        assignees=assignees,
        raw_output=raw,
    )


def parse_chore(prompt: str) -> AIParseResponse:
    pipe = get_pipeline()
    formatted = PROMPT_TEMPLATE.format(sentence=prompt)

    try:
        output = pipe(formatted)[0]["generated_text"]
        raw = output.strip()

        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not json_match:
            return _fallback_parse(prompt, raw)

        parsed = json.loads(json_match.group())

        imp = parsed.get("importance", 3)
        if isinstance(imp, str):
            imp = IMPORTANCE_MAP.get(imp.lower(), 3)
        imp = max(1, min(5, int(imp)))

        rec = str(parsed.get("recurrence", "none")).lower()
        rec = RECURRENCE_MAP.get(rec, rec if rec in ("weekly", "monthly", "yearly") else "none")

        return AIParseResponse(
            title=parsed.get("title", prompt[:60]),
            recurrence=rec,
            importance=imp,
            assignees=parsed.get("assignees") or [],
            project=parsed.get("project"),
            due_date=parsed.get("due_date"),
            raw_output=raw,
        )

    except Exception as e:
        logger.warning("Flan-T5 parse failed (%s), using fallback", e)
        return _fallback_parse(prompt, "")
