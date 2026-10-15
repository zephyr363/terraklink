import { test, expect } from "@playwright/test";

test("language choice persists across routes and reload, including forms and legal text", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Язык сайта" }).selectOption("kk");
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await expect(page.locator(".plant-title h1")).toHaveText(
    "«TERRAKLINK» кірпіш зауыты",
  );
  await expect(
    page.getByRole("button", { name: "Тек қажеттілерін" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Тек қажеттілерін" }).click();
  await page
    .locator(".main-nav")
    .getByRole("link", { name: "Байланыс", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Өтінім жіберу" }),
  ).toBeVisible();
  await expect(page.getByLabel("Атыңыз", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Сайт тілі" })).toHaveValue(
    "kk",
  );
  await page.goto("/legal/privacy");
  await expect(
    page.getByRole("heading", { name: "Құпиялылық саясаты", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Қандай деректерді аламыз" }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Сайт тілі" }).selectOption("ru");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(
    page.getByRole("heading", {
      name: "Политика конфиденциальности",
      exact: true,
    }),
  ).toBeVisible();
});

test("language selector is available on mobile without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("combobox", { name: "Язык сайта" }).selectOption("kk");
  await expect(page.getByRole("combobox", { name: "Сайт тілі" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Мәзірді ашу" }).click();
  await page
    .locator(".main-nav")
    .getByRole("link", { name: "Каталог", exact: true })
    .click();
  await expect(page.locator(".catalog-page")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Барлығы", exact: true }),
  ).toBeVisible();
});
