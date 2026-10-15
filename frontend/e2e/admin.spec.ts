import {
  test,
  expect,
  type Page,
  type Locator,
  type APIRequestContext,
} from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ContentResponse, SiteDocument } from "../src/domain/content";
import { newSection } from "../src/domain/content";

let access = "";
let originalDraft: SiteDocument;
let originalPublished: SiteDocument;
let videoFile: { name: string; mimeType: string; buffer: Buffer };

async function login(page: Page) {
  await page.getByLabel("Логин", { exact: true }).fill("editor");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(
      process.env.E2E_EDITOR_PASSWORD ??
        readFileSync("../.local/admin-password.txt", "utf8").trim(),
    );
  const response = page.waitForResponse(
    (res) =>
      res.url().endsWith("/api/auth/login/") &&
      res.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(200);
  access = (await result.json()).access;
  await expect(
    page.getByRole("heading", { name: "Редактор главной страницы" }),
  ).toBeVisible();
}

const auth = () => ({ Authorization: `Bearer ${access}` });
async function draft(request: APIRequestContext): Promise<ContentResponse> {
  const response = await request.get("/api/editor/content/", {
    headers: auth(),
  });
  expect(response.status()).toBe(200);
  return response.json();
}

async function setColor(control: Locator, color: string) {
  await control.evaluate((input: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, color);
}
async function save(page: Page) {
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(
    page.getByText("Черновик сохранён.", { exact: false }),
  ).toBeVisible();
}
async function preview(page: Page) {
  await page.getByRole("button", { name: "Предпросмотр", exact: true }).click();
}
async function editor(page: Page) {
  await page.getByRole("button", { name: "В редактор", exact: true }).click();
}

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8",
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const result = new Promise<number[]>((resolve) => {
      recorder.onstop = async () =>
        resolve(
          Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())),
        );
    });
    recorder.start();
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? "#ff6d00" : "#eeeeee";
      ctx.fillRect(0, 0, 160, 90);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    recorder.stop();
    const output = await result;
    stream.getTracks().forEach((track) => track.stop());
    return output;
  });
  videoFile = {
    name: "admin-regression.webm",
    mimeType: "video/webm",
    buffer: Buffer.from(bytes),
  };
  await page.close();
});

test.beforeEach(async ({ page, request }) => {
  access = "";
  await page.goto("/admin");
  await login(page);
  originalDraft = structuredClone((await draft(request)).document);
  originalPublished = structuredClone(
    (await (await request.get("/api/content/")).json()).document,
  );
});

test.afterEach(async ({ request }) => {
  // Restore both snapshots even when an assertion fails; never leave a test page published.
  if (!access || !originalDraft || !originalPublished) return;
  let current = await draft(request);
  let restored = await request.put("/api/editor/content/", {
    headers: auth(),
    data: { revision: current.revision, document: originalPublished },
  });
  expect(restored.status()).toBe(200);
  current = await restored.json();
  const published = await request.post("/api/editor/publish/", {
    headers: auth(),
    data: { revision: current.revision },
  });
  expect(published.status()).toBe(200);
  current = await published.json();
  restored = await request.put("/api/editor/content/", {
    headers: auth(),
    data: { revision: current.revision, document: originalDraft },
  });
  expect(restored.status()).toBe(200);
});

test("hero text, font and color persist into preview and publication", async ({
  page,
  request,
}) => {
  await page
    .getByLabel("Заголовок", { exact: true })
    .fill("Проверка оформления заголовка");
  await page.getByRole("combobox", { name: /^Шрифт/ }).selectOption("Georgia");
  await setColor(page.getByLabel("Цвет текста", { exact: true }), "#145b8e");
  await save(page);
  const saved = (await draft(request)).document.sections[0];
  expect(saved.font).toBe("Georgia");
  expect(saved.color).toBe("#145b8e");
  await page
    .getByRole("button", { name: "Оформление и контакты", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: /^Основной шрифт/ })
    .selectOption("Arial");
  await setColor(page.getByLabel("Акцентный цвет"), "#246810");
  await save(page);
  await preview(page);
  await expect(page.locator(".admin-preview .public-site")).toHaveCSS(
    "font-family",
    /Arial/,
  );
  await expect(
    page
      .locator(".admin-preview .main-header")
      .getByRole("button", { name: "Заказать", exact: true }),
  ).toHaveCSS("background-color", "rgb(36, 104, 16)");
  const heading = page.locator(".admin-preview .plant-title h1");
  await expect(heading).toHaveText("Проверка оформления заголовка");
  await expect(heading).toHaveCSS("color", "rgb(20, 91, 142)");
  await expect(heading).toHaveCSS("font-family", /Georgia/);
  await editor(page);
  await page.getByRole("button", { name: "Опубликовать", exact: true }).click();
  await expect(
    page.getByText("Изменения опубликованы на сайте."),
  ).toBeVisible();
  const publicPage = await page.context().newPage();
  await publicPage.goto("/");
  await expect(publicPage.locator(".plant-title h1")).toHaveCSS(
    "color",
    "rgb(20, 91, 142)",
  );
  await publicPage.close();
});

test("sections support text, appearance, ordering, visibility, photos and playable video", async ({
  page,
  request,
}) => {
  await page.getByLabel("Тип новой секции").selectOption("text");
  await page.getByRole("button", { name: "Добавить секцию" }).click();
  await page
    .getByLabel("Заголовок", { exact: true })
    .fill("Проверочная секция");
  await page
    .getByLabel("Текст / подзаголовок")
    .fill("Текст из редактора\nВторая строка");
  await page.getByRole("combobox", { name: /^Шрифт/ }).selectOption("Arial");
  await setColor(page.getByLabel("Цвет текста", { exact: true }), "#124f30");
  await setColor(page.getByLabel("Цвет фона", { exact: true }), "#fff0dd");
  await page.getByLabel(/Яркость/).fill("80");
  await page.getByLabel(/Насыщенность/).fill("60");
  const uploaded = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/editor/media/") &&
      response.request().method() === "POST",
  );
  await page
    .locator(".section-editor input[type=file]")
    .first()
    .setInputFiles("public/assets/project-2.jpg");
  expect((await uploaded).status()).toBe(201);
  await expect(
    page.getByText("Файл загружен.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Поднять Проверочная секция", exact: true })
    .click();
  await save(page);
  const saved = (await draft(request)).document;
  const section = saved.sections.find(
    (section) => section.title === "Проверочная секция",
  )!;
  expect(saved.sections.at(-2)?.id).toBe(section.id);
  await preview(page);
  const rendered = page.locator(`.admin-preview section[id="${section.id}"]`);
  await expect(rendered).toHaveCSS("background-color", "rgb(255, 240, 221)");
  await expect(rendered.locator("h2")).toHaveCSS("color", "rgb(18, 79, 48)");
  await expect(rendered).toHaveCSS("font-family", /Arial/);
  await expect(rendered.locator("img")).toBeVisible();
  await expect(rendered.locator("img")).toHaveCSS(
    "filter",
    "brightness(0.8) saturate(0.6)",
  );
  expect(
    await rendered
      .locator("img")
      .evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0);
  await editor(page);
  await page.getByLabel("Показывать на сайте").uncheck();
  await preview(page);
  await expect(
    page.locator(`.admin-preview section[id="${section.id}"]`),
  ).toHaveCount(0);
  await editor(page);
  await page.getByLabel("Показывать на сайте").check();
  const videoResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/editor/media/") &&
      response.request().method() === "POST",
  );
  await page
    .locator(".section-editor input[type=file]")
    .nth(1)
    .setInputFiles(videoFile);
  expect((await videoResponse).status()).toBe(201);
  await expect(page.getByLabel("Ссылка на видео")).not.toHaveValue("");
  await save(page);
  await preview(page);
  const video = page.locator(
    `.admin-preview section[id="${section.id}"] video`,
  );
  await expect(video).toBeVisible();
  await expect(video).toHaveCSS("filter", "brightness(0.8) saturate(0.6)");
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  expect(
    await video.evaluate((element: HTMLVideoElement) => element.error),
  ).toBeNull();
  await editor(page);
  await page.getByRole("button", { name: "Удалить выбранную секцию" }).click();
  await save(page);
  expect(
    (await draft(request)).document.sections.some(
      (item) => item.id === section.id,
    ),
  ).toBe(false);
});

test("preview navigation keeps unsaved draft in the editor and disables real enquiries", async ({
  page,
}) => {
  await page
    .getByLabel("Заголовок", { exact: true })
    .fill("Несохранённый черновик");
  await preview(page);
  await page
    .locator(".admin-preview")
    .getByRole("navigation")
    .getByRole("link", { name: "Каталог", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator(".admin-preview .catalog-page")).toBeVisible();
  await page
    .locator(".admin-preview")
    .getByRole("navigation")
    .getByRole("link", { name: "Контакты", exact: true })
    .click();
  await expect(
    page
      .locator(".admin-preview")
      .getByRole("button", { name: "Отправить заявку" }),
  ).toBeDisabled();
  await editor(page);
  await expect(page.getByLabel("Заголовок", { exact: true })).toHaveValue(
    "Несохранённый черновик",
  );
});

test("every section type renders its media and extra features do not duplicate the main heading", async ({
  page,
  request,
}) => {
  const upload = await request.post("/api/editor/media/", {
    headers: auth(),
    multipart: { file: videoFile },
  });
  expect(upload.status()).toBe(201);
  const { url } = await upload.json();
  const current = await draft(request);
  const sections = [
    ...current.document.sections,
    ...(["text", "image", "video", "features"] as const).map(newSection),
  ];
  for (const section of sections) {
    section.visible = true;
    section.image = "/assets/project-2.jpg";
    section.video = url;
  }
  sections.at(-1)!.title = "Дополнительные преимущества";
  const response = await request.put("/api/editor/content/", {
    headers: auth(),
    data: {
      revision: current.revision,
      document: { ...current.document, sections },
    },
  });
  expect(response.status()).toBe(200);
  // Another editor changed the document; load that snapshot through conflict recovery.
  await page.getByLabel("Заголовок", { exact: true }).fill("Локальная версия");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Другой редактор");
  await page
    .getByRole("button", { name: "Загрузить серверную версию", exact: false })
    .click();
  await preview(page);
  for (const section of sections) {
    const video = page.locator(
      `.admin-preview section[id="${section.id}"] video`,
    );
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute("src", url);
    await expect(video).toHaveAttribute("poster", "/assets/project-2.jpg");
  }
  await expect(page.locator(".admin-preview .plant-title h1")).toHaveCount(1);
  await expect(
    page
      .locator(".admin-preview")
      .getByRole("heading", { name: "Дополнительные преимущества" }),
  ).toBeVisible();
});

test("unsupported upload shows the server reason and leaves the image unchanged", async ({
  page,
}) => {
  const image = await page
    .getByLabel("Ссылка на изображение", { exact: true })
    .inputValue();
  await page
    .locator(".section-editor input[type=file]")
    .first()
    .setInputFiles({
      name: "unsupported.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
  await expect(page.getByRole("alert")).toContainText(
    "Разрешены JPG, PNG, WebP, MP4 и WebM.",
  );
  await expect(
    page.getByLabel("Ссылка на изображение", { exact: true }),
  ).toHaveValue(image);
});

test("failed conflict reload preserves edits and successful reload takes the server version", async ({
  page,
  request,
}) => {
  await page
    .getByLabel("Заголовок", { exact: true })
    .fill("Мои локальные правки");
  const current = await draft(request);
  current.document.sections[0].title = "Правки другого редактора";
  expect(
    (
      await request.put("/api/editor/content/", {
        headers: auth(),
        data: { revision: current.revision, document: current.document },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Другой редактор");
  const reload = page.getByRole("button", {
    name: "Загрузить серверную версию",
    exact: false,
  });
  await page.route("**/api/editor/content/", (route) =>
    route.request().method() === "GET" ? route.abort() : route.continue(),
  );
  await reload.click();
  await expect(page.getByLabel("Заголовок", { exact: true })).toHaveValue(
    "Мои локальные правки",
  );
  await expect(page.getByRole("alert")).toBeVisible();
  await page.unroute("**/api/editor/content/");
  await reload.click();
  await expect(page.getByLabel("Заголовок", { exact: true })).toHaveValue(
    "Правки другого редактора",
  );
});

test("logging out with unsaved changes does not prevent the next login from loading the editor", async ({
  page,
}) => {
  await page
    .getByLabel("Заголовок", { exact: true })
    .fill("Несохранённое перед выходом");
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await login(page);
  await expect(page.getByLabel("Заголовок", { exact: true })).toHaveValue(
    originalDraft.sections[0].title,
  );
});

test("Kazakh edits are independent, invalid company fields never reach the API, and publication keeps both languages", async ({
  page,
  request,
}) => {
  const russianTitle = originalDraft.sections[0].title;
  await page.getByLabel("Язык контента").selectOption("kk");
  await page
    .getByLabel("Заголовок", { exact: true })
    .fill("Әкімші өзгерткен тақырып");
  await save(page);
  let saved = (await draft(request)).document;
  expect(saved.sections[0].title).toBe(russianTitle);
  expect(saved.translations?.kk?.sections[0].title).toBe(
    "Әкімші өзгерткен тақырып",
  );
  await page.getByLabel("Язык контента").selectOption("ru");
  await expect(page.getByLabel("Заголовок", { exact: true })).toHaveValue(
    russianTitle,
  );
  await page.getByRole("button", { name: "Оформление и контакты" }).click();
  await page.getByLabel("Телефон", { exact: true }).fill("123");
  await page.getByLabel("Email", { exact: true }).fill("invalid");
  let requests = 0;
  page.on("request", (req) => {
    if (req.method() === "PUT") requests++;
  });
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Телефон");
  expect(requests).toBe(0);
  await page
    .getByLabel("Телефон", { exact: true })
    .fill(originalDraft.company.phone);
  await page
    .getByLabel("Email", { exact: true })
    .fill(originalDraft.company.email);
  await save(page);
  await page.getByRole("button", { name: "Опубликовать", exact: true }).click();
  await expect(
    page.getByText("Изменения опубликованы на сайте."),
  ).toBeVisible();
  const publicPage = await page.context().newPage();
  await publicPage.goto("/");
  await publicPage
    .getByRole("combobox", { name: "Язык сайта" })
    .selectOption("kk");
  await expect(publicPage.locator(".plant-title h1")).toHaveText(
    "Әкімші өзгерткен тақырып",
  );
  await publicPage
    .getByRole("combobox", { name: "Сайт тілі" })
    .selectOption("ru");
  await expect(publicPage.locator(".plant-title h1")).toHaveText(russianTitle);
  await publicPage.close();
});
