import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("order and callback have distinct forms and enquiry subjects", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Только необходимые" }).click();
  await page
    .locator(".main-header")
    .getByRole("button", { name: "Заказать звонок", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Заказать звонок" }),
  ).toBeVisible();
  await expect(dialog.locator('textarea[name="message"]')).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page
    .locator(".main-header")
    .getByRole("button", { name: "Заказать", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Заказать продукцию" }),
  ).toBeVisible();
  await dialog.getByLabel("Ваше имя").fill("Тест заказа");
  await dialog.getByLabel("Телефон", { exact: true }).fill("+77000000000");
  await dialog
    .getByLabel("Что хотите заказать?")
    .fill("Кирпич, 1000 шт., Астана");
  await dialog.locator('input[name="consent"]').check();
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/leads/") && r.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Отправить заказ" }).click();
  const sent = await response;
  expect(sent.status()).toBe(201);
  expect(sent.request().postDataJSON().message).toBe(
    "Заказ продукции\nКирпич, 1000 шт., Астана",
  );
});

test("native catalog creates, edits and deletes a draft product with separate uploads", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const title = `Браузерный товар ${Date.now()}`;
  await page.goto("/django-admin/login/");
  await page.locator("#id_username").fill("editor");
  await page
    .locator("#id_password")
    .fill(
      process.env.E2E_EDITOR_PASSWORD ??
        readFileSync("../.local/admin-password.txt", "utf8").trim(),
    );
  await page.locator('button[type="submit"], input[type="submit"]').click();
  await page.goto("/django-admin/cms/product/add/");
  await expect(
    page.getByText("Владельцу сайта", { exact: true }).first(),
  ).toBeVisible();
  await page.locator("#id_title").fill(title);
  await page.locator("#id_text").fill("Описание товара из браузерного теста");
  await page.locator("#id_category").fill("Тестовая категория");
  await page.locator("#id_price").fill("700");
  await page
    .locator("#id_preview_upload")
    .setInputFiles("public/assets/product-1.jpg");
  await page.locator("#id_attributes").fill("Формат: 1 НФ");
  await page.locator("#id_promo_enabled").check();
  await page.locator("#id_promo_label").fill("Промо из админки");
  await page.locator("#id_promo_price").fill("650");
  await page
    .getByText("Добавить еще один Фотография карусели", { exact: true })
    .click();
  await page.locator("#id_images-0-position").fill("1");
  await page
    .locator("#id_images-0-upload")
    .setInputFiles("public/assets/project-1.jpg");
  await page.locator("#id_images-0-alt").fill("Фасад");
  await page.locator('[name="_save"]').click();
  await expect(page).toHaveURL(/\/cms\/product\/$/);
  await page.getByRole("link", { name: title, exact: true }).click();
  const preview = await page.locator("#id_preview").inputValue();
  expect(preview).not.toBe(await page.locator("#id_images-0-url").inputValue());
  await expect(page.locator("#id_promo_label")).toHaveValue("Промо из админки");
  await page.locator("#id_title").fill(title + " изменён");
  await page.locator('[name="_save"]').click();
  await page
    .getByRole("link", { name: title + " изменён", exact: true })
    .click();
  await page.locator('a[href$="/delete/"]').click();
  await page
    .locator('button[type="submit"], input[type="submit"]')
    .filter({ hasText: "Да" })
    .click();
  await expect(page).toHaveURL(/\/cms\/product\/$/);
  await expect(
    page.getByRole("link", { name: title + " изменён", exact: true }),
  ).toHaveCount(0);
});
