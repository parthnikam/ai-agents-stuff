from datetime import date, timedelta
from typing import List


def get_week_of_month(d: date) -> int:
    """Return which week of the month (1-5) a date falls in."""
    first_day = d.replace(day=1)
    dom = d.day
    adjusted_dom = dom + first_day.weekday()
    return int((adjusted_dom - 1) / 7) + 1


def generate_weekly_dates(anchor: date, count: int = 52) -> List[date]:
    return [anchor + timedelta(weeks=i) for i in range(count)]


def generate_monthly_dates(anchor: date, count: int = 12) -> List[date]:
    dates = []
    current = anchor
    for _ in range(count):
        dates.append(current)
        month = current.month + 1
        year = current.year + (month - 1) // 12
        month = ((month - 1) % 12) + 1
        try:
            current = current.replace(year=year, month=month)
        except ValueError:
            import calendar
            last_day = calendar.monthrange(year, month)[1]
            current = current.replace(year=year, month=month, day=last_day)
    return dates


def generate_yearly_dates(anchor: date, count: int = 5) -> List[date]:
    dates = []
    for i in range(count):
        try:
            dates.append(anchor.replace(year=anchor.year + i))
        except ValueError:
            dates.append(anchor.replace(year=anchor.year + i, day=28))
    return dates
