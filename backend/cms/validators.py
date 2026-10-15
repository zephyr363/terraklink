import re

from django.core.exceptions import ValidationError


def validate_phone(value):
    if (
        not re.fullmatch(r"[+\d ()-]{10,50}", value)
        or not 10 <= len(re.sub(r"\D", "", value)) <= 15
    ):
        raise ValidationError("Введите корректный телефон (от 10 до 15 цифр).")
