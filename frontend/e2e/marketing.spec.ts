import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { SiteDocument } from "../src/domain/content";

test("gallery CRUD, scheduled promotions, product pages and editable search metadata", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const original = (await (await request.get("/api/content/")).json())
    .document as SiteDocument;
  let access = "";
  let originalDraft: SiteDocument | undefined;
  await page.goto("/admin");
  await page.getByLabel("Логин", { exact: true }).fill("editor");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(
      process.env.E2E_EDITOR_PASSWORD ??
        readFileSync("../.local/admin-password.txt", "utf8").trim(),
    );
  const login = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/login/") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  access = (await (await login).json()).access;
  const headers = { Authorization: `Bearer ${access}` };
  const reopenEditor = async () => {
    await page.goto("/admin");
    await page.getByLabel("Логин", { exact: true }).fill("editor");
    await page
      .getByLabel("Пароль", { exact: true })
      .fill(
        process.env.E2E_EDITOR_PASSWORD ??
          readFileSync("../.local/admin-password.txt", "utf8").trim(),
      );
    await page.getByRole("button", { name: "Войти", exact: true }).click();
  };
  const getDraft = async () =>
    await (await request.get("/api/editor/content/", { headers })).json();
  const saveViaApi = async (document: SiteDocument, publish = false) => {
    const current = await getDraft();
    const saved = await request.put("/api/editor/content/", {
      headers,
      data: { revision: current.revision, document },
    });
    expect(saved.status()).toBe(200);
    if (publish)
      expect(
        (
          await request.post("/api/editor/publish/", {
            headers,
            data: { revision: (await saved.json()).revision },
          })
        ).status(),
      ).toBe(200);
  };
  try {
    await expect(
      page.getByRole("heading", { name: "Редактор главной страницы" }),
    ).toBeVisible();
    originalDraft = (await getDraft()).document;
    const catalog = originalDraft!.sections.find(
      (section) => section.type === "catalog",
    )!;
    const product = catalog.items[0];
    await page
      .locator(".section-row")
      .filter({ hasText: catalog.title })
      .getByRole("button")
      .first()
      .click();
    const item = page.locator(".item-editor").first();
    await item.locator("summary").click();
    await item
      .getByRole("button", { name: "Добавить фото", exact: true })
      .click();
    const row = item.locator(".gallery-editor-row").last();
    const uploaded = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/editor/media/") &&
        response.request().method() === "POST",
    );
    await row
      .locator('input[type="file"]')
      .setInputFiles("public/assets/project-1.jpg");
    expect((await uploaded).status()).toBe(201);
    await expect(row.getByLabel("Ссылка на фото")).toHaveValue(/\/media\//);
    await row.getByLabel("Описание фото (alt)").fill("Фасад — второе фото");
    await row.getByRole("button", { name: "Фото выше" }).click();
    await item.getByRole("button", { name: "Добавить промо" }).click();
    await item.getByLabel("Название промо").fill("Осенняя акция");
    await item.getByLabel("Текст промо").fill("Специальное предложение");
    await item.getByLabel("Промо-цена", { exact: false }).fill("1.00");
    await item.getByLabel("Показывать промо").check();
    await item
      .getByLabel("SEO-заголовок товара")
      .fill("Кирпич TerraKlink — тест SEO");
    await item
      .getByLabel("SEO-описание товара")
      .fill("Описание кирпича для поиска");
    await page
      .getByRole("button", { name: "Оформление и контакты", exact: true })
      .click();
    await page
      .getByLabel("Публичный HTTPS-адрес сайта")
      .fill("https://brand.example");
    await page.getByLabel("SEO-заголовок главной").fill("TerraKlink Казахстан");
    await page.getByLabel("Город", { exact: true }).fill("Алматы");
    await page
      .getByLabel("Справка о бренде для ИИ-поиска")
      .fill("Кирпич для проектов в Казахстане");
    await page.getByRole("button", { name: "Добавить вопрос" }).click();
    await page
      .getByLabel("Вопрос", { exact: true })
      .fill("Где заказать кирпич?");
    await page
      .getByLabel("Ответ", { exact: true })
      .fill("Свяжитесь с отделом продаж.");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(
      page.getByText("Черновик сохранён.", { exact: false }),
    ).toBeVisible();
    expect((await (await request.get("/api/seo/")).json()).title).not.toBe(
      "TerraKlink Казахстан",
    );
    await page
      .getByRole("button", { name: "Опубликовать", exact: true })
      .click();
    await expect(
      page.getByText("Изменения опубликованы на сайте."),
    ).toBeVisible();
    await page.goto("/catalog");
    await page.getByRole("button", { name: "Только необходимые" }).click();
    const card = page.locator(".product-card").filter({
      has: page.getByRole("link", { name: product.title, exact: true }),
    });
    await expect(
      card.getByText("Осенняя акция", { exact: true }),
    ).toBeVisible();
    await expect(card.locator(".product-gallery > img")).toHaveAttribute(
      "alt",
      "Фасад — второе фото",
    );
    await card.getByRole("button", { name: "Следующее фото" }).click();
    await expect(card.locator(".gallery-count")).toHaveText("2 / 2");
    await card.getByRole("link", { name: product.title, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/catalog/${product.id}$`));
    await expect(page).toHaveTitle("Кирпич TerraKlink — тест SEO");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Описание кирпича для поиска",
    );
    await expect(
      page.locator(".product-detail-page .gallery-thumbnails button"),
    ).toHaveCount(2);
    await expect(page.locator(".product-price del")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: product.title, exact: true }),
    ).toBeVisible();
    await page.goto("/");
    await expect(page).toHaveTitle("TerraKlink Казахстан");
    await page.getByText("Где заказать кирпич?", { exact: true }).click();
    await expect(page.getByText("Свяжитесь с отделом продаж.")).toBeVisible();
    await reopenEditor();
    await expect(
      page.getByRole("heading", { name: "Редактор главной страницы" }),
    ).toBeVisible();
    await page
      .locator(".section-row")
      .filter({ hasText: catalog.title })
      .getByRole("button")
      .first()
      .click();
    await page.locator(".item-editor").first().locator("summary").click();
    await page
      .locator(".item-editor")
      .first()
      .locator(".gallery-editor-row")
      .first()
      .getByRole("button", { name: "Удалить фото", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Удалить промо", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Опубликовать", exact: true })
      .click();
    await expect(
      page.getByText("Изменения опубликованы на сайте."),
    ).toBeVisible();
    await page.goto(`/catalog/${product.id}`);
    await expect(page.locator(".gallery-thumbnails")).toHaveCount(0);
    await expect(page.locator(".product-promo")).toHaveCount(0);
    await reopenEditor();
    await expect(
      page.getByRole("heading", { name: "Редактор главной страницы" }),
    ).toBeVisible();
    await page
      .locator(".section-row")
      .filter({ hasText: catalog.title })
      .getByRole("button")
      .first()
      .click();
    await page.locator(".item-editor").first().locator("summary").click();
    await page
      .locator(".item-editor")
      .first()
      .getByRole("button", { name: "Удалить фото", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Опубликовать", exact: true })
      .click();
    await expect(
      page.getByText("Изменения опубликованы на сайте."),
    ).toBeVisible();
    await page.goto(`/catalog/${product.id}`);
    await page.reload();
    await expect(page.getByText("Фото пока нет")).toBeVisible();
  } finally {
    if (access && originalDraft) {
      await saveViaApi(original, true);
      await saveViaApi(originalDraft);
    }
  }
});

test("native admin exposes Russian content and token labels", async ({
  page,
}) => {
  await page.goto("/django-admin/");
  await page.getByLabel("Имя пользователя").fill("editor");
  await page
    .getByLabel("Пароль")
    .fill(
      process.env.E2E_EDITOR_PASSWORD ??
        readFileSync("../.local/admin-password.txt", "utf8").trim(),
    );
  await page.getByRole("button", { name: "Войти" }).click();
  for (const label of [
    "Медиафайлы",
    "Содержимое сайта",
    "Выданные токены",
    "Отозванные токены",
  ])
    await expect(
      page.getByRole("link", { name: label, exact: true }),
    ).toBeVisible();
  await page.getByRole("link", { name: "Медиафайлы", exact: true }).click();
  await expect(
    page.getByRole("columnheader", { name: "Тип файла" }),
  ).toBeVisible();
});
