import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { SiteDocument } from "../src/domain/content";
test.use({ actionTimeout: 10000 });

test("workspaces, banner templates, product attributes and promo upload", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  page.on("pageerror", (error) => {
    console.error(error.message);
  });
  await page.addInitScript(() => localStorage.setItem("tk-region", "Алматы"));
  await page.goto("/management");
  await page.getByLabel("Логин", { exact: true }).fill("editor");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(
      process.env.E2E_EDITOR_PASSWORD ??
        readFileSync("../.local/admin-password.txt", "utf8").trim(),
    );
  const login = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/login/") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  const headers = {
    Authorization: `Bearer ${(await (await login).json()).access}`,
  };
  const original = (await (await request.get("/api/content/")).json())
    .document as SiteDocument;
  const getDraft = async () =>
    await (await request.get("/api/editor/content/", { headers })).json();
  const draft = await getDraft();
  const save = async (document: SiteDocument, publish = false) => {
    const current = await getDraft();
    const saved = await request.put("/api/editor/content/", {
      headers,
      data: { document, revision: current.revision },
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
      page.getByRole("heading", { name: "Управление", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Аналитика", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Аналитика", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("analytics.png"),
      fullPage: true,
    });
    await page.getByRole("link", { name: "Редактор", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Редактор главной страницы" }),
    ).toBeVisible();
    await page.getByLabel("Тип баннера").selectOption("split");
    await page.getByLabel("Анимация", { exact: true }).selectOption("fade");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(
      page.getByText("Черновик сохранён.", { exact: false }),
    ).toBeVisible();
    const configured = (await getDraft()).document as SiteDocument;
    const bannerRevision = (await getDraft()).revision;
    const catalog = configured.sections.find((s) => s.type === "catalog")!;
    const item = catalog.items[0];
    item.attributes = [{ name: "Марка прочности", value: "М150" }];
    item.promo = { enabled: true, label: "Промо E2E", text: "Тест", price: 1 };
    await save(configured);
    // Re-enter the editor via SPA navigation so it loads the new revision.
    await page.getByRole("link", { name: "Управление", exact: true }).click();
    await page.getByRole("link", { name: "Редактор", exact: true }).click();
    await page
      .locator(".section-row")
      .filter({ hasText: catalog.title })
      .getByRole("button")
      .first()
      .click();
    const editor = page.locator(".item-editor").first();
    await editor.locator("summary").click();
    await editor
      .getByLabel("Загрузить изображение промо")
      .setInputFiles("public/assets/project-1.jpg");
    await expect(editor.getByLabel("Ссылка на изображение промо")).toHaveValue(
      /\/media\//,
    );
    await page
      .getByRole("button", { name: "Опубликовать", exact: true })
      .click();
    await expect(
      page.getByText("Изменения опубликованы на сайте."),
    ).toBeVisible();
    await page.goto("/");
    await expect(
      page.locator(".hero.banner-split.animation-fade"),
    ).toBeVisible();
    await page.goto("/catalog");
    await page.getByLabel("Только акции", { exact: true }).check();
    await page
      .getByRole("button", { name: "Сравнить", exact: true })
      .first()
      .click();
    await expect(page.locator(".comparison")).toContainText("М150");
    await page.goto(`/catalog/${item.id}`);
    await expect(page.locator(".promo-image")).toBeVisible();
    await expect(page.getByText("М150", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("/management");
    await page.getByLabel("Логин", { exact: true }).fill("editor");
    await page
      .getByLabel("Пароль", { exact: true })
      .fill(
        process.env.E2E_EDITOR_PASSWORD ??
          readFileSync("../.local/admin-password.txt", "utf8").trim(),
      );
    await page.getByRole("button", { name: "Войти", exact: true }).click();
    await page
      .getByRole("button", { name: "История редакций", exact: true })
      .click();
    const historyRow = page
      .locator(".workspace-row")
      .filter({ hasText: new RegExp(`№${bannerRevision} ·`) });
    await historyRow
      .getByRole("button", { name: "Восстановить", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Подтвердить восстановление" })
      .click();
    await expect(
      page.getByText("Создан новый черновик.", { exact: false }),
    ).toBeVisible();
    const restored = (await getDraft()).document as SiteDocument;
    expect(
      restored.sections.find((s) => s.type === "hero")?.banner?.template,
    ).toBe("split");
    expect(
      (
        await (await request.get("/api/content/")).json()
      ).document.sections.find((s: { type: string }) => s.type === "catalog")
        .items[0].promo.label,
    ).toBe("Промо E2E");
    await page.screenshot({
      path: test.info().outputPath("management-mobile.png"),
      fullPage: true,
    });
  } finally {
    await save(original, true);
    await save(draft.document);
  }
});

test("analytics starts only after consent and stops after refusal", async ({
  page,
}) => {
  const events: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/api/analytics/events/"))
      events.push(r.postData() ?? "");
  });
  await page.addInitScript(() => {
    localStorage.removeItem("tk-consent");
    localStorage.setItem("tk-region", "Алматы");
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Принять все", exact: true }),
  ).toBeVisible();
  expect(events).toHaveLength(0);
  await page.getByRole("button", { name: "Принять все", exact: true }).click();
  await expect.poll(() => events.length).toBe(1);
  expect(JSON.parse(events[0])).toMatchObject({
    consent: true,
    event: "page_view",
    path: "/",
  });
  await page.evaluate(() => {
    localStorage.setItem(
      "tk-consent",
      JSON.stringify({
        version: "2026-10-16",
        analytics: false,
        at: new Date().toISOString(),
      }),
    );
    window.dispatchEvent(new Event("tk-consent"));
  });
  await page
    .getByRole("link", { name: "Каталог", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Поиск кирпича")).toBeVisible();
  expect(events).toHaveLength(1);
});
