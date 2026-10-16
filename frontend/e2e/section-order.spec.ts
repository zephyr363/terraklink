import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { SiteDocument } from "../src/domain/content";

test("touch dragging supports cancellation and preserves published data", async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    await page.goto("/admin");
    await page.getByLabel("Логин", { exact: true }).fill("editor");
    await page
      .getByLabel("Пароль", { exact: true })
      .fill(
        process.env.E2E_EDITOR_PASSWORD ??
          readFileSync("../.local/admin-password.txt", "utf8").trim(),
      );
    await page.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(page.locator("[data-section-id]").first()).toBeVisible();
    const rows = page.locator("[data-section-id]");
    const ids = async () =>
      rows.evaluateAll((elements) =>
        elements.map((r) => (r as HTMLElement).dataset.sectionId),
      );
    const original = await ids();
    const before = await (await request.get("/api/content/")).json();
    const handle = rows
      .first()
      .getByRole("button", { name: /^Перетащить секцию/ });
    await handle.scrollIntoViewIfNeeded();
    const source = (await handle.boundingBox())!;
    const target = (await rows.nth(1).boundingBox())!;
    const client = await context.newCDPSession(page);
    const start = {
      x: source.x + source.width / 2,
      y: source.y + source.height / 2,
    };
    const end = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2,
    };
    for (const cancel of [true, false]) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [start],
      });
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [end],
      });
      await client.send("Input.dispatchTouchEvent", {
        type: cancel ? "touchCancel" : "touchEnd",
        touchPoints: [],
      });
      await expect
        .poll(ids)
        .toEqual(
          cancel ? original : [original[1], original[0], ...original.slice(2)],
        );
    }
    expect(await (await request.get("/api/content/")).json()).toEqual(before);
    const currentHandle = rows
      .first()
      .getByRole("button", { name: /^Перетащить секцию/ });
    await currentHandle.scrollIntoViewIfNeeded();
    const handleBox = (await currentHandle.boundingBox())!;
    const pane = page.locator(".section-list");
    const paneBox = (await pane.boundingBox())!;
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        {
          x: handleBox.x + handleBox.width / 2,
          y: handleBox.y + handleBox.height / 2,
        },
      ],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: paneBox.x + paneBox.width / 2,
          y: Math.min(paneBox.y + paneBox.height - 12, 832),
        },
      ],
    });
    await expect
      .poll(() => pane.evaluate((node) => node.scrollTop))
      .toBeGreaterThan(100);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath("section-order-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});

test("section positions, pointer dragging and keyboard moves persist as a draft", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
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
  const getDraft = async () =>
    await (await request.get("/api/editor/content/", { headers })).json();
  const original = (await getDraft()).document as SiteDocument;
  const publicBefore = await (await request.get("/api/content/")).json();
  const [first, second, third] = original.sections;
  const row = (id: string) => page.locator(`[data-section-id="${id}"]`);
  const ids = async () =>
    page
      .locator("[data-section-id]")
      .evaluateAll((rows) =>
        rows.map((r) => (r as HTMLElement).dataset.sectionId),
      );
  try {
    await row(first.id).getByRole("spinbutton").fill("3");
    await row(first.id).getByRole("spinbutton").press("Enter");
    await expect
      .poll(ids)
      .toEqual([
        second.id,
        third.id,
        first.id,
        ...original.sections.slice(3).map((s) => s.id),
      ]);
    await row(first.id).getByRole("spinbutton").fill("0");
    await row(first.id).getByRole("spinbutton").press("Enter");
    await expect(page.getByRole("status")).toContainText(
      "Введите целую позицию",
    );
    await row(first.id).getByRole("spinbutton").fill("1");
    await row(first.id).getByRole("spinbutton").press("Enter");
    await row(third.id)
      .getByRole("button", { name: /^Перетащить секцию/ })
      .dragTo(row(first.id));
    await expect
      .poll(ids)
      .toEqual([
        third.id,
        first.id,
        second.id,
        ...original.sections.slice(3).map((s) => s.id),
      ]);
    await row(third.id)
      .getByRole("button", { name: /^Перетащить секцию/ })
      .focus();
    await page.keyboard.press("ArrowDown");
    await expect
      .poll(ids)
      .toEqual([
        first.id,
        third.id,
        second.id,
        ...original.sections.slice(3).map((s) => s.id),
      ]);
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(
      page.getByText("Черновик сохранён.", { exact: false }),
    ).toBeVisible();
    expect(
      (await getDraft()).document.sections.map((s: { id: string }) => s.id),
    ).toEqual(await ids());
    expect(await (await request.get("/api/content/")).json()).toEqual(
      publicBefore,
    );
  } finally {
    const current = await getDraft();
    expect(
      (
        await request.put("/api/editor/content/", {
          headers,
          data: { revision: current.revision, document: original },
        })
      ).status(),
    ).toBe(200);
  }
});
