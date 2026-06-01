from unittest.mock import patch, MagicMock
from app.services.ai_service import parse_chore, _fallback_parse


def _mock_pipeline(output_text):
    mock = MagicMock()
    mock.return_value = [{"generated_text": output_text}]
    return mock


def test_valid_json_output():
    json_out = '{"title": "Clean kitchen", "recurrence": "weekly", "importance": 4, "assignees": ["John"], "project": null, "due_date": null}'
    with patch("app.services.ai_service.get_pipeline", return_value=_mock_pipeline(json_out)):
        result = parse_chore("Clean kitchen every Monday, assign to John, high importance")
    assert result.title == "Clean kitchen"
    assert result.recurrence == "weekly"
    assert result.importance == 4
    assert "John" in result.assignees


def test_fallback_on_bad_output():
    with patch("app.services.ai_service.get_pipeline", return_value=_mock_pipeline("not json at all")):
        result = parse_chore("Take out trash every Friday, low priority")
    assert result.title != ""
    assert result.recurrence == "weekly"
    assert result.importance == 1


def test_fallback_parse_directly():
    result = _fallback_parse("Mop floors every month, assign to Alice, critical", "")
    assert result.recurrence == "monthly"
    assert result.importance == 5
    assert "Alice" in result.assignees


def test_importance_clamped():
    json_out = '{"title": "Test", "recurrence": "none", "importance": 99, "assignees": [], "project": null, "due_date": null}'
    with patch("app.services.ai_service.get_pipeline", return_value=_mock_pipeline(json_out)):
        result = parse_chore("Test")
    assert result.importance == 5
