"""Translate database failures at HTTP boundaries; never expose SQL or credentials."""

import logging

from django.db import IntegrityError, OperationalError
from django.shortcuts import render
from django.utils.deprecation import MiddlewareMixin
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def database_error(exc):
    if isinstance(exc, IntegrityError):
        return 409, "Данные конфликтуют с существующей записью. Обновите страницу и проверьте поля."
    if isinstance(exc, OperationalError):
        return (
            503,
            "База данных временно недоступна. Повторите попытку позже.",
        )
    return None


def api_exception_handler(exc, context):
    error = database_error(exc)
    if error:
        status, detail = error
        logger.warning("Database request failed: %s", type(exc).__name__)
        return Response(
            {"detail": detail},
            status=status,
            headers={"Retry-After": "5"} if status == 503 else None,
        )
    return exception_handler(exc, context)


class DatabaseErrorMiddleware(MiddlewareMixin):
    def process_exception(self, request, exception):
        error = database_error(exception)
        if error:
            status, detail = error
            logger.warning("Database view failed: %s", type(exception).__name__)
            response = render(None, "admin/database_error.html", {"detail": detail}, status=status)
            if status == 503:
                response["Retry-After"] = "5"
            return response
        return None
