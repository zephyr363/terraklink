"""Наполнить БД демонстрационными товарами с промо-акциями и каруселью."""

from decimal import Decimal

from django.core.management.base import BaseCommand

from cms.models import Product, ProductImage

PRODUCTS = [
    {
        "code": "brick-001",
        "title": "Облицовочный кирпич «Альпийский»",
        "text": "Клинкерный облицовочный кирпич для фасадов и цоколей. Морозостойкость F100.",
        "category": "Облицовочный",
        "price": "3200.00",
        "preview": "/assets/products/brick-001-preview.jpg",
        "tag": "Новинка",
        "attributes": [
            {"name": "Порода", "value": "Клинкер"},
            {"name": "Цвет", "value": "Белый"},
            {"name": "Размер, мм", "value": "250x120x65"},
            {"name": "Морозостойкость", "value": "F100"},
        ],
        "promo": {
            "enabled": True,
            "label": "Скидка 15%",
            "text": "Акция на облицовочный кирпич «Альпийский» до конца месяца.",
            "price": "2720.00",
            "image": "/assets/products/brick-001-promo.jpg",
            "video": "",
            "starts_on": "2026-10-01",
            "ends_on": "2026-10-31",
        },
        "images": [
            {"id": "b001-1", "url": "/assets/products/brick-001-1.jpg", "alt": "Вид спереди"},
            {"id": "b001-2", "url": "/assets/products/brick-001-2.jpg", "alt": "Вид сбоку"},
            {"id": "b001-3", "url": "/assets/products/brick-001-3.jpg", "alt": "Текстура"},
        ],
    },
    {
        "code": "brick-002",
        "title": "Облицовочный кирпич «Кирпичный紅色»",
        "text": "Классический красный облицовочный кирпич для жилых домов.",
        "category": "Облицовочный",
        "price": "2800.00",
        "preview": "/assets/products/brick-002-preview.jpg",
        "tag": "Хит",
        "attributes": [
            {"name": "Порода", "value": "Керамика"},
            {"name": "Цвет", "value": "Красный"},
            {"name": "Размер, мм", "value": "250x120x65"},
            {"name": "Морозостойкость", "value": "F75"},
        ],
        "promo": {
            "enabled": True,
            "label": "Акция",
            "text": "Выгодное предложение на красный кирпич.",
            "price": "2520.00",
            "image": "/assets/products/brick-002-promo.jpg",
            "video": "",
            "starts_on": "2026-10-10",
            "ends_on": "2026-10-25",
        },
        "images": [
            {"id": "b002-1", "url": "/assets/products/brick-002-1.jpg", "alt": "Вид спереди"},
            {"id": "b002-2", "url": "/assets/products/brick-002-2.jpg", "alt": "Вид сбоку"},
        ],
    },
    {
        "code": "brick-003",
        "title": "Облицовочный кирпич «Тёмный шоколад»",
        "text": "Тёмный облицовочный кирпич для современных фасадов.",
        "category": "Облицовочный",
        "price": "3500.00",
        "preview": "/assets/products/brick-003-preview.jpg",
        "tag": "",
        "attributes": [
            {"name": "Порода", "value": "Клинкер"},
            {"name": "Цвет", "value": "Тёмно-коричневый"},
            {"name": "Размер, мм", "value": "250x120x65"},
            {"name": "Морозостойкость", "value": "F100"},
        ],
        "promo": {
            "enabled": False,
            "label": "",
            "text": "",
            "price": None,
            "image": "",
            "video": "",
            "starts_on": None,
            "ends_on": None,
        },
        "images": [
            {"id": "b003-1", "url": "/assets/products/brick-003-1.jpg", "alt": "Вид спереди"},
        ],
    },
    {
        "code": "clinker-001",
        "title": "Клинкерная плитка «Городская»",
        "text": "Клинкерная плитка для внутренней и внешней отделки.",
        "category": "Клинкер",
        "price": "4200.00",
        "preview": "/assets/products/clinker-001-preview.jpg",
        "tag": "Новинка",
        "attributes": [
            {"name": "Порода", "value": "Клинкер"},
            {"name": "Цвет", "value": "Серый"},
            {"name": "Размер, мм", "value": "240x115x52"},
            {"name": "Морозостойкость", "value": "F150"},
        ],
        "promo": {
            "enabled": True,
            "label": "Акция",
            "text": "Скидка на клинкерную плитку при заказе от 50 м².",
            "price": "3780.00",
            "image": "/assets/products/clinker-001-promo.jpg",
            "video": "",
            "starts_on": "2026-10-01",
            "ends_on": "2026-10-31",
        },
        "images": [
            {"id": "c001-1", "url": "/assets/products/clinker-001-1.jpg", "alt": "Вид спереди"},
            {"id": "c001-2", "url": "/assets/products/clinker-001-2.jpg", "alt": "Укладка"},
        ],
    },
    {
        "code": "clinker-002",
        "title": "Клинкерная плитка «Ретро»",
        "text": "Клинкерная плитка в стиле ретро для фасадов и интерьеров.",
        "category": "Клинкер",
        "price": "3900.00",
        "preview": "/assets/products/clinker-002-preview.jpg",
        "tag": "",
        "attributes": [
            {"name": "Порода", "value": "Клинкер"},
            {"name": "Цвет", "value": "Красный"},
            {"name": "Размер, мм", "value": "240x115x52"},
            {"name": "Морозостойкость", "value": "F100"},
        ],
        "promo": {
            "enabled": False,
            "label": "",
            "text": "",
            "price": None,
            "image": "",
            "video": "",
            "starts_on": None,
            "ends_on": None,
        },
        "images": [
            {"id": "c002-1", "url": "/assets/products/clinker-002-1.jpg", "alt": "Вид спереди"},
        ],
    },
    {
        "code": "fireplace-001",
        "title": "Кирпич для камина «Гарнитур»",
        "text": "Огнеупорный кирпич для каминов и печей.",
        "category": "Огнеупорный",
        "price": "5500.00",
        "preview": "/assets/products/fireplace-001-preview.jpg",
        "tag": "",
        "attributes": [
            {"name": "Порода", "value": "Огнеупорная глина"},
            {"name": "Цвет", "value": "Жёлто-коричневый"},
            {"name": "Размер, мм", "value": "250x123x65"},
            {"name": "Термостойкость", "value": "1200°C"},
        ],
        "promo": {
            "enabled": True,
            "label": "Скидка 10%",
            "text": "Акция на огнеупорный кирпич для каминов.",
            "price": "4950.00",
            "image": "/assets/products/fireplace-001-promo.jpg",
            "video": "/assets/products/fireplace-001-promo.mp4",
            "starts_on": "2026-10-15",
            "ends_on": "2026-11-15",
        },
        "images": [
            {"id": "f001-1", "url": "/assets/products/fireplace-001-1.jpg", "alt": "Вид спереди"},
            {"id": "f001-2", "url": "/assets/products/fireplace-001-2.jpg", "alt": "В камине"},
        ],
    },
    {
        "code": "paver-001",
        "title": "Тротуарная плитка «Парковая»",
        "text": "Тротуарная плитка для садовых дорожек и площадок.",
        "category": "Тротуарная",
        "price": "1800.00",
        "preview": "/assets/products/paver-001-preview.jpg",
        "tag": "Хит",
        "attributes": [
            {"name": "Порода", "value": "Бетон"},
            {"name": "Цвет", "value": "Серый"},
            {"name": "Размер, мм", "value": "200x100x60"},
            {"name": "Морозостойкость", "value": "F200"},
        ],
        "promo": {
            "enabled": True,
            "label": "Акция",
            "text": "Скидка на тротуарную плитку при самовывозе.",
            "price": "1620.00",
            "image": "/assets/products/paver-001-promo.jpg",
            "video": "",
            "starts_on": "2026-10-01",
            "ends_on": "2026-10-31",
        },
        "images": [
            {"id": "p001-1", "url": "/assets/products/paver-001-1.jpg", "alt": "Вид спереди"},
            {"id": "p001-2", "url": "/assets/products/paver-001-2.jpg", "alt": "Укладка"},
        ],
    },
    {
        "code": "paver-002",
        "title": "Тротуарная плитка «Цветная»",
        "text": "Цветная тротуарная плитка для декоративной укладки.",
        "category": "Тротуарная",
        "price": "2100.00",
        "preview": "/assets/products/paver-002-preview.jpg",
        "tag": "",
        "attributes": [
            {"name": "Порода", "value": "Бетон"},
            {"name": "Цвет", "value": "Разноцветный"},
            {"name": "Размер, мм", "value": "200x100x60"},
            {"name": "Морозостойкость", "value": "F200"},
        ],
        "promo": {
            "enabled": False,
            "label": "",
            "text": "",
            "price": None,
            "image": "",
            "video": "",
            "starts_on": None,
            "ends_on": None,
        },
        "images": [
            {"id": "p002-1", "url": "/assets/products/paver-002-1.jpg", "alt": "Вид спереди"},
        ],
    },
    {
        "code": "facing-001",
        "title": "Фасадный кирпич «Премиум»",
        "text": "Премиальный фасадный кирпич для элитного строительства.",
        "category": "Фасадный",
        "price": "4500.00",
        "preview": "/assets/products/facing-001-preview.jpg",
        "tag": "Новинка",
        "attributes": [
            {"name": "Порода", "value": "Керамика"},
            {"name": "Цвет", "value": "Бежевый"},
            {"name": "Размер, мм", "value": "250x120x65"},
            {"name": "Морозостойкость", "value": "F100"},
        ],
        "promo": {
            "enabled": True,
            "label": "Скидка 20%",
            "text": "Сезонная распродажа фасадного кирпича.",
            "price": "3600.00",
            "image": "/assets/products/facing-001-promo.jpg",
            "video": "",
            "starts_on": "2026-10-05",
            "ends_on": "2026-10-20",
        },
        "images": [
            {"id": "fa001-1", "url": "/assets/products/facing-001-1.jpg", "alt": "Вид спереди"},
            {"id": "fa001-2", "url": "/assets/products/facing-001-2.jpg", "alt": "Фасад"},
        ],
    },
]


class Command(BaseCommand):
    help = "Наполняет БД демонстрационными товарами с промо и каруселью."

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for data in PRODUCTS:
            product, was_created = Product.objects.update_or_create(
                code=data["code"],
                language="ru",
                defaults={
                    "section_id": data["category"],
                    "title": data["title"],
                    "text": data["text"],
                    "category": data["category"],
                    "price": Decimal(data["price"]),
                    "preview": data["preview"],
                    "tag": data.get("tag", ""),
                    "attributes": data.get("attributes", []),
                    "promo": data.get("promo", {}),
                    "seo_title": data["title"],
                    "seo_description": data["text"][:320],
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

            # Sync images
            new_ids = set()
            for index, image in enumerate(data.get("images", [])):
                new_ids.add(image["id"])
                ProductImage.objects.update_or_create(
                    product=product,
                    image_id=image["id"],
                    defaults={
                        "url": image["url"],
                        "alt": image["alt"],
                        "position": index + 1,
                    },
                )
            ProductImage.objects.filter(product=product).exclude(
                image_id__in=new_ids
            ).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Создано: {created}, обновлено: {updated}. Всего товаров: {Product.objects.count()}"
            )
        )
