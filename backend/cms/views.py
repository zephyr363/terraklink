import uuid
from pathlib import Path

from django.conf import settings
from django.core.paginator import EmptyPage, Paginator
from django.db import connection, models
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from PIL import Image, UnidentifiedImageError
from rest_framework import serializers, status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Lead, MediaAsset, Product, SiteContent
from .serializers import (
    DocumentSerializer,
    LeadSerializer,
    ProductSerializer,
    SaveSerializer,
)
from .services import update_content


def health(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    return JsonResponse({"status": "ok"})


class PublicConfigView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(
            {
                "languages": ["ru", "kk"],
                "upload_limits": {
                    "image_mb": settings.MAX_IMAGE_UPLOAD_MB,
                    "video_mb": settings.MAX_VIDEO_UPLOAD_MB,
                },
            }
        )


@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"csrfToken": get_token(request)})


def attach_refresh(response, token):
    response.set_cookie(
        "refresh",
        str(token),
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Strict",
        path="/api/auth/",
        max_age=8 * 3600,
    )
    response["Cache-Control"] = "no-store"
    return response


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = TokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not serializer.user.is_staff:
            return Response({"detail": "Доступ только для редакторов."}, status=403)
        return attach_refresh(
            Response({"access": serializer.validated_data["access"]}),
            serializer.validated_data["refresh"],
        )


@method_decorator(csrf_protect, name="dispatch")
class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_authenticate_header(self, request):
        return "Bearer"

    def post(self, request):
        serializer = TokenRefreshSerializer(data={"refresh": request.COOKIES.get("refresh", "")})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(str(exc)) from exc
        return attach_refresh(
            Response({"access": serializer.validated_data["access"]}),
            serializer.validated_data["refresh"],
        )


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        from rest_framework_simplejwt.exceptions import TokenError

        try:
            RefreshToken(request.COOKIES.get("refresh", "")).blacklist()
        except TokenError:
            pass
        response = Response(status=204)
        response.delete_cookie("refresh", path="/api/auth/")
        return response


class PublicContentView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        site = get_object_or_404(SiteContent, key="main")
        return Response({"document": site.published, "revision": site.published_revision})


class EditorContentView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        site = get_object_or_404(SiteContent, key="main")
        response = Response(
            {
                "document": site.draft,
                "revision": site.revision,
                "published_revision": site.published_revision,
            }
        )
        response["Cache-Control"] = "no-store"
        return response

    def put(self, request):
        serializer = SaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        site = update_content(
            expected_revision=serializer.validated_data["revision"],
            document=serializer.validated_data["document"],
            editor=request.user,
        )
        return Response(
            {
                "document": site.draft,
                "revision": site.revision,
                "published_revision": site.published_revision,
            }
        )


class PublishView(APIView):
    def post(self, request):
        revision = serializers.IntegerField(min_value=1).run_validation(
            request.data.get("revision")
        )
        site = get_object_or_404(SiteContent, key="main")
        validator = DocumentSerializer(data=site.draft)
        validator.is_valid(raise_exception=True)
        site = update_content(expected_revision=revision, editor=request.user, publish=True)
        return Response(
            {
                "document": site.draft,
                "revision": site.revision,
                "published_revision": site.published_revision,
            }
        )


class UploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            raise serializers.ValidationError("Выберите файл для загрузки.")
        extension = Path(file.name).suffix.lower()
        kind = "image"
        if extension in {".jpg", ".jpeg", ".png", ".webp"}:
            if file.size > settings.MAX_IMAGE_UPLOAD_MB * 1024 * 1024:
                raise serializers.ValidationError(
                    f"Изображение должно быть не больше {settings.MAX_IMAGE_UPLOAD_MB} МБ."
                )
            try:
                image = Image.open(file)
                if image.width * image.height > 40_000_000:
                    raise serializers.ValidationError("Слишком большое разрешение изображения.")
                if image.format not in {"JPEG", "PNG", "WEBP"}:
                    raise serializers.ValidationError("Неподдерживаемое изображение.")
                image.verify()
            except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
                raise serializers.ValidationError("Повреждённое изображение.")
        elif extension in {".mp4", ".webm"}:
            kind = "video"
            if file.size > settings.MAX_VIDEO_UPLOAD_MB * 1024 * 1024:
                raise serializers.ValidationError(
                    f"Видео должно быть не больше {settings.MAX_VIDEO_UPLOAD_MB} МБ."
                )
            header = file.read(32)
            if not (
                (extension == ".mp4" and header[4:8] == b"ftyp")
                or (extension == ".webm" and header[:4] == b"\x1aE\xdf\xa3")
            ):
                raise serializers.ValidationError("Некорректный видеофайл.")
        else:
            raise serializers.ValidationError("Разрешены JPG, PNG, WebP, MP4 и WebM.")
        file.seek(0)
        original_name = file.name[:200]
        file.name = f"{uuid.uuid4().hex}{extension}"
        asset = MediaAsset.objects.create(
            file=file, kind=kind, name=original_name, uploaded_by=request.user
        )
        return Response({"id": asset.pk, "url": asset.file.url, "kind": kind}, status=201)


class LeadsView(APIView):
    def get(self, request):
        return Response(LeadSerializer(Lead.objects.all()[:200], many=True).data)


class CreateLeadView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "lead"

    def post(self, request):
        serializer = LeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead = serializer.save()
        return Response({"id": lead.pk, "detail": "Заявка принята"}, status=status.HTTP_201_CREATED)


class ProductListView(APIView):
    """Список товаров с пагинацией и фильтрами."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "anon"

    def get(self, request):
        language = request.query_params.get("language", "ru")
        queryset = Product.objects.filter(language=language).order_by("section_id", "code")

        category = request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search)
                | models.Q(code__icontains=search)
                | models.Q(text__icontains=search)
            )

        min_price = request.query_params.get("min_price")
        if min_price:
            queryset = queryset.filter(price__gte=min_price)

        max_price = request.query_params.get("max_price")
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        promo_only = request.query_params.get("promo_only")
        if promo_only == "true":
            queryset = queryset.filter(promo__enabled=True)

        sort = request.query_params.get("sort", "default")
        if sort == "price-asc":
            queryset = queryset.order_by("price")
        elif sort == "price-desc":
            queryset = queryset.order_by("-price")
        elif sort == "name":
            queryset = queryset.order_by("title")

        page_size = int(request.query_params.get("page_size", 12))
        page_number = int(request.query_params.get("page", 1))

        paginator = Paginator(queryset, page_size)
        try:
            page = paginator.page(page_number)
        except EmptyPage:
            page = paginator.page(paginator.num_pages)

        serializer = ProductSerializer(page.object_list, many=True)
        return Response(
            {
                "count": paginator.count,
                "page_size": page_size,
                "page": page.number,
                "total_pages": paginator.num_pages,
                "has_next": page.has_next(),
                "has_previous": page.has_previous(),
                "results": serializer.data,
            }
        )


class ProductDetailView(APIView):
    """Одна карточка товара по коду (артикулу)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, code):
        language = request.query_params.get("language", "ru")
        product = get_object_or_404(Product, code=code, language=language)
        serializer = ProductSerializer(product)
        return Response(serializer.data)
