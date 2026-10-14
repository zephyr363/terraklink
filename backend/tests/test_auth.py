import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def csrf_client():
    client = APIClient(enforce_csrf_checks=True)
    token = client.get("/api/auth/csrf/").json()["csrfToken"]
    client.credentials(HTTP_X_CSRFTOKEN=token)
    return client


def test_login_requires_csrf(editor):
    client = APIClient(enforce_csrf_checks=True)
    response = client.post(
        "/api/auth/login/",
        {"username": "editor", "password": "TestOnly-Password-42!"},
        format="json",
    )
    assert response.status_code == 403


def test_refresh_cookie_rotates_and_logout_revokes(editor):
    client = csrf_client()
    result = client.post(
        "/api/auth/login/",
        {"username": "editor", "password": "TestOnly-Password-42!"},
        format="json",
    )
    assert result.status_code == 200
    assert set(result.data) == {"access"}
    cookie = result.cookies["refresh"]
    assert cookie["httponly"] and cookie["samesite"] == "Strict"
    original = cookie.value
    refreshed = client.post("/api/auth/refresh/", {}, format="json")
    assert refreshed.status_code == 200
    assert refreshed.cookies["refresh"].value != original
    stolen = csrf_client()
    stolen.cookies["refresh"] = original
    assert stolen.post("/api/auth/refresh/", {}, format="json").status_code == 401
    latest = refreshed.cookies["refresh"].value
    assert client.post("/api/auth/logout/", {}, format="json").status_code == 204
    client.cookies["refresh"] = latest
    assert client.post("/api/auth/refresh/", {}, format="json").status_code == 401


def test_regular_user_cannot_login_as_editor(django_user_model):
    django_user_model.objects.create_user("visitor", password="TestOnly-Password-42!")
    client = csrf_client()
    assert (
        client.post(
            "/api/auth/login/",
            {"username": "visitor", "password": "TestOnly-Password-42!"},
            format="json",
        ).status_code
        == 403
    )
