import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";

test("reference layout, catalog search, region choice and cookie preference", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Кирпичный завод «TERRAKLINK»" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Только необходимые" }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tk-consent")!).analytics,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Выберите город" }).click();
  await expect(
    page.getByRole("button", { name: "Определить мой город" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Алматы", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Алматы", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Главная навигация" })
    .getByRole("link", { name: "Каталог", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Поиск кирпича" })
    .fill("Камень счастья");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Поиск кирпича" })
    .fill("Несуществующий материал");
  await expect(page.getByText("Ничего не найдено.")).toBeVisible();
});

test("lead form stores enquiry and consent", async ({ page }) => {
  await page.goto("/contacts");
  await page.getByRole("button", { name: "Только необходимые" }).click();
  await page.getByLabel("Ваше имя").fill("Тестовая заявка");
  await page.getByLabel("Телефон", { exact: true }).fill("+7 (701) 123-45-67");
  await page.locator("input[name=consent]").check();
  const response = page.waitForResponse(
    (res) =>
      res.url().endsWith("/api/leads/") && res.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Отправить заявку" }).click();
  expect((await response).status()).toBe(201);
  await expect(page.getByText("Спасибо за обращение!")).toBeVisible();
});

test("editor saves a draft, previews it, publishes and restores the original content", async ({
  page,
  request,
}) => {
  const original = (await (await request.get("/api/content/")).json()).document;
  const password =
    process.env.E2E_EDITOR_PASSWORD ??
    readFileSync("../.local/admin-password.txt", "utf8");
  await page.goto("/admin");
  await page.getByLabel("Логин", { exact: true }).fill("editor");
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Редактор главной страницы" }),
  ).toBeVisible();
  await page
    .getByLabel("Заголовок", { exact: true })
    .fill("Редактируемый тестовый заголовок");
  const uploaded = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/editor/media/") &&
      response.request().method() === "POST",
  );
  await page
    .locator(".section-editor input[type=file]")
    .first()
    .setInputFiles("public/assets/project-1.jpg");
  expect((await uploaded).status()).toBe(201);
  await expect(
    page.getByText("Файл загружен.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(
    page.getByText("Черновик сохранён.", { exact: false }),
  ).toBeVisible();
  expect(
    (await (await request.get("/api/content/")).json()).document.sections[0]
      .title,
  ).toBe(original.sections[0].title);
  await page.getByRole("button", { name: "Предпросмотр", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Редактируемый тестовый заголовок" }),
  ).toBeVisible();
  await expect(page.locator(".hero-image")).toHaveAttribute("src", /\/media\//);
  await page.getByRole("button", { name: "В редактор", exact: true }).click();
  await page.getByRole("button", { name: "Опубликовать", exact: true }).click();
  await expect(
    page.getByText("Изменения опубликованы на сайте."),
  ).toBeVisible();
  expect(
    (await (await request.get("/api/content/")).json()).document.sections[0]
      .title,
  ).toBe("Редактируемый тестовый заголовок");
  await page
    .getByLabel("Заголовок", { exact: true })
    .fill(original.sections[0].title);
  await page
    .getByLabel("Ссылка на изображение", { exact: true })
    .fill(original.sections[0].image);
  await page.getByRole("button", { name: "Опубликовать", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/content/")).json()).document.sections[0]
          .title,
    )
    .toBe(original.sections[0].title);
  mkdirSync("../docs/screenshots", { recursive: true });
  await page.screenshot({
    path: "../docs/screenshots/admin-desktop.png",
    fullPage: true,
  });
});

test("desktop and mobile layout have no horizontal overflow or broken media", async ({
  page,
}) => {
  mkdirSync("../docs/screenshots", { recursive: true });
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Кирпичный завод «TERRAKLINK»" }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      for (const img of document.images) {
        img.loading = "eager";
        if (!img.complete)
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
      }
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        [...document.images]
          .filter((img) => !img.naturalWidth)
          .map((img) => img.src),
      ),
    ).toEqual([]);
    await page.screenshot({
      path: `../docs/screenshots/site-${viewport.width}.png`,
      fullPage: true,
    });
  }
});
