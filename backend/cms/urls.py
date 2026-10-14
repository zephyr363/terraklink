from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health),
    path("auth/csrf/", views.csrf),
    path("auth/login/", views.LoginView.as_view()),
    path("auth/refresh/", views.RefreshView.as_view()),
    path("auth/logout/", views.LogoutView.as_view()),
    path("content/", views.PublicContentView.as_view()),
    path("editor/content/", views.EditorContentView.as_view()),
    path("editor/publish/", views.PublishView.as_view()),
    path("editor/media/", views.UploadView.as_view()),
    path("editor/leads/", views.LeadsView.as_view()),
    path("leads/", views.CreateLeadView.as_view()),
]
