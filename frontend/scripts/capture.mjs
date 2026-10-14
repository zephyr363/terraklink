import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('../docs/screenshots', { recursive: true });
const browser = await chromium.launch();
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  await page.goto(process.env.QA_BASE_URL || 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `../docs/screenshots/viewport-${viewport.width}.png` });
  await page.close();
}
await browser.close();
