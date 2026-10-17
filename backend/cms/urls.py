from django.urls import path

from . import views, workspace
from .seo import seo_api

urlpatterns = [
    path("analytics/events/", workspace.EventsView.as_view()),
    path("editor/analytics/", workspace.AnalyticsView.as_view()),
    path("editor/history/", workspace.HistoryView.as_view()),
    path("editor/restore/", workspace.RestoreView.as_view()),
    path("editor/library/", workspace.MediaLibraryView.as_view()),
    path("editor/leads/<int:pk>/", workspace.LeadStatusView.as_view()),
    path("health/", views.health),
    path("config/", views.PublicConfigView.as_view()),
    path("seo/", seo_api),
    path("products/", views.ProductListView.as_view()),
    path("products/<str:code>/", views.ProductDetailView.as_view()),
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
