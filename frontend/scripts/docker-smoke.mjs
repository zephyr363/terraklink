import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const browser = await chromium.launch();
const page = await browser.newPage();
const origin = 'http://localhost:8080';
const issues = [];
page.on('pageerror', error => issues.push(error.message));
try {
  const health = await page.request.get(`${origin}/api/health/`);
  if (health.status() !== 200) throw new Error(`Health: ${health.status()}`);
  await page.goto(`${origin}/admin`);
  await page.getByLabel('Логин', { exact: true }).fill('editor');
  await page.getByLabel('Пароль', { exact: true }).fill(readFileSync('../.local/admin-password.txt', 'utf8'));
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await page.getByRole('heading', { name: 'Редактор главной страницы' }).waitFor();
  const uploaded = page.waitForResponse(response => response.url().endsWith('/api/editor/media/') && response.request().method() === 'POST');
  await page.locator('.section-editor input[type=file]').first().setInputFiles('public/assets/project-1.jpg');
  const response = await uploaded;
  if (response.status() !== 201) throw new Error(`Upload: ${response.status()}`);
  const asset = await response.json();
  if (!asset.url.startsWith(`${origin}/storage/terraklink/`)) throw new Error('Unexpected S3 URL');
  const media = await page.request.get(asset.url);
  if (media.status() !== 200 || !(media.headers()['content-type'] || '').startsWith('image/')) throw new Error('MinIO object unreadable');
  const anonymousList = await page.request.get(`${origin}/storage/terraklink/?list-type=2`);
  if (anonymousList.status() !== 403) throw new Error('Anonymous bucket listing must be forbidden');
  // Upload verification is intentionally not saved into the published document.
  await page.getByLabel('Ссылка на изображение', { exact: true }).fill('/assets/hero-family.png');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.getByText('Черновик сохранён.', { exact: false }).waitFor();
  const draft = await page.evaluate(async () => {
    const csrf = await (await fetch('/api/auth/csrf/')).json();
    const refresh = await (await fetch('/api/auth/refresh/', { method: 'POST', headers: { 'X-CSRFToken': csrf.csrfToken } })).json();
    return (await fetch('/api/editor/content/', { headers: { Authorization: `Bearer ${refresh.access}` } })).json();
  });
  if (!draft.revision) throw new Error('PostgreSQL draft not persisted');
  await page.goto(origin);
  await page.getByRole('heading', { name: 'Кирпичный завод «TERRAKLINK»' }).waitFor();
  if (issues.length) throw new Error(issues.join('\n'));
  console.log('Docker smoke passed: Nginx + React + JWT/CSRF + PostgreSQL + MinIO upload/read + private bucket listing');
} finally { await browser.close(); }
