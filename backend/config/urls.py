from cms import seo
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

urlpatterns = [path("django-admin/", admin.site.urls), path("api/", include("cms.urls"))]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += [
    path("robots.txt", seo.robots),
    path("sitemap.xml", seo.sitemap),
    path("llms.txt", seo.llms),
    re_path(r"^(?P<path>.*)$", seo.public_page),
]
