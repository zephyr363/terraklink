"""Generate one schema shared by Django seed and reference fixtures."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def item(id, title, text="", image="", category="", price=0, tag=""):
    return dict(id=id, title=title, text=text, image=image, category=category, price=price, tag=tag)


def section(id, type, title, subtitle="", image="", items=None, background="#ffffff"):
    return dict(id=id, type=type, title=title, subtitle=subtitle, visible=True, image=image,
                video="", color="#222222", background=background, font="Open Sans",
                brightness=100, saturation=100, items=items or [])


document = {
    "theme": {"accent": "#ff6d00", "font": "Open Sans"},
    "company": {"name": "TERRAKLINK", "phone": "+7 (727) 000-00-00", "email": "info@terraklink.example",
                "address": "Казахстан, г. Алматы — демонстрационный адрес", "demo": True},
    "sections": [
        section("hero", "hero", "Кирпичный завод «TERRAKLINK»", "", "/assets/hero-family.png", items=[
            item("slide-1", "Кирпич для вашего дома", "Демонстрационный баннер референса", "/assets/hero-family.png"),
            item("slide-2", "Коллекция клинкерного кирпича", "Демонстрационный баннер референса", "/assets/banner.jpg"),
        ]),
        section("features", "features", "", items=[
            item("f1", "Поставки для вашего проекта", "От частного дома до жилого комплекса", "/assets/feature-1.png"),
            item("f2", "Баварская кладка", "Выразительные сочетания оттенков кирпича", "/assets/feature-2.png"),
            item("f3", "Точная геометрия", "Внимание к каждой детали вашего фасада", "/assets/feature-3.png"),
            item("f4", "Натуральный материал", "Керамика для уютного и долговечного дома", "/assets/feature-4.png"),
        ], background="#f7f8f9"),
        section("catalog", "catalog", "Продукция", items=[
            item("p1", "Камень счастья 0,7 НФ", "Облицовочный керамический кирпич", "/assets/product-1.jpg", "Облицовочный кирпич", 320, "Новинка"),
            item("p2", "Хранитель времени 1 НФ", "Выразительная фактура и тёплый оттенок", "/assets/product-2.jpg", "Коллекция Тайга", 350),
            item("p3", "Дар земли 0,7 НФ", "Естественная палитра для вашего фасада", "/assets/product-3.jpg", "Облицовочный кирпич", 290),
            item("p4", "Красный оберег 1 НФ", "Классический цвет керамического кирпича", "/assets/product-4.jpg", "Облицовочный кирпич", 310),
            item("p5", "Тайга графит 1 НФ", "Глубокий цвет, выразительная поверхность", "/assets/product-5.jpg", "Коллекция Тайга", 390, "Коллекция Тайга"),
            item("p6", "Клинкер бежевый 0,7 НФ", "Светлый кирпич для современной архитектуры", "/assets/product-6.jpg", "Клинкер", 420),
        ]),
        section("projects", "projects", "Выполненные проекты", "Идеи для вашей будущей архитектуры", items=[
            item("pr1", "Современный жилой комплекс", "Пример многоквартирной застройки", "/assets/project-1.jpg", "Многоэтажные"),
            item("pr2", "Городская архитектура", "Пример применения облицовочного кирпича", "/assets/project-2.jpg", "Многоэтажные"),
            item("pr3", "Загородный квартал", "Пример малоэтажного строительства", "/assets/project-3.jpg", "Малоэтажные"),
            item("pr4", "Частный дом", "Пример фактуры и цвета фасада", "/assets/project-4.jpg", "Малоэтажные"),
        ], background="#f7f8f9"),
        section("consultation", "consultation", "Получите ответ на 5 основных вопросов", "Подскажем, как выбрать кирпич для вашего проекта.", items=[
            item("q1", "Как рассчитать стоимость лицевой кладки?"),
            item("q2", "На чём можно сэкономить при выборе кирпича?"),
            item("q3", "Как подобрать цвет и фактуру фасада?"),
            item("q4", "Какой раствор подходит для баварской кладки?"),
            item("q5", "Чем отличаются форматы 0,7 НФ и 1 НФ?"),
        ]),
        section("about", "about", "Кирпич — основа красивого дома", "Мы помогаем подобрать облицовочный кирпич для частного строительства и архитектурных проектов. В каталоге представлены разные оттенки, фактуры и форматы.\n\nРасскажите нам о вашем проекте — мы поможем выбрать подходящее сочетание материала и кладки.", "/assets/about.jpg", background="#f7f8f9"),
        section("offers", "catalog", "Действующие акции", "Демонстрационные предложения. Цены и наличие уточняются у менеджера.", items=[
            item("o1", "Клинкер бежевый 0,7 НФ", "Демонстрационная цена за штуку", "/assets/product-6.jpg", "Клинкер", 350, "Акция"),
            item("o2", "Красный оберег 1 НФ", "Демонстрационная цена за штуку", "/assets/product-4.jpg", "Облицовочный кирпич", 280, "Акция"),
            item("o3", "Дар земли 0,7 НФ", "Демонстрационная цена за штуку", "/assets/product-3.jpg", "Облицовочный кирпич", 260, "Акция"),
        ]),
        section("contact", "contact", "Обсудим ваш проект", "Поможем выбрать кирпич и рассчитать необходимое количество.", background="#f7f8f9"),
    ],
}

if __name__ == "__main__":
    target = ROOT / "backend/cms/seed.json"
    target.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Seed document generated")
