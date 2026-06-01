
from datetime import date

def calculate_age(birth_date):
    today = date.today()
    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    return age

if __name__ == "__main__":
    print("Enter your birth date:")
    year = int(input("Year (YYYY): "))
    month = int(input("Month (MM): "))
    day = int(input("Day (DD): "))

    birth_date = date(year, month, day)
    age = calculate_age(birth_date)

    print(f"You are {age} years old.")
