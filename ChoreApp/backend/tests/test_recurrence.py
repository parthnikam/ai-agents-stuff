from datetime import date
from app.utils.date_utils import generate_weekly_dates, generate_monthly_dates, generate_yearly_dates


def test_weekly_generates_52():
    anchor = date(2025, 1, 6)
    dates = generate_weekly_dates(anchor, 52)
    assert len(dates) == 52
    assert dates[0] == anchor
    assert dates[1] == date(2025, 1, 13)


def test_monthly_generates_12():
    anchor = date(2025, 1, 15)
    dates = generate_monthly_dates(anchor, 12)
    assert len(dates) == 12
    assert dates[1] == date(2025, 2, 15)


def test_yearly_generates_5():
    anchor = date(2025, 3, 1)
    dates = generate_yearly_dates(anchor, 5)
    assert len(dates) == 5
    assert dates[1] == date(2026, 3, 1)


def test_feb_29_yearly():
    # Leap day edge case
    anchor = date(2024, 2, 29)
    dates = generate_yearly_dates(anchor, 3)
    assert len(dates) == 3
