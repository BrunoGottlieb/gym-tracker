const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Sao_Paulo' });
    await context.route('**/api/backups?*', route => route.abort());
    await context.route('**/api/avatars',r=>r.abort());await context.route('**/api/streaks', route => route.fulfill({ json: route.request().method() === 'POST' ? { ok: true, accepted: [] } : {
      version: 1, today: '2026-11-03', dates: [{ person: 'ivan', date: '2026-10-31' }],
      trainingDays: { original: [1, 2, 3, 4, 5], sheet: [1, 2, 3, 4, 5], ivan: [1, 2, 3, 5, 6] },
    } }));
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-11-03T12:00:00-03:00') });
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:4174/gym-tracker/');
    await page.locator('.streak-header-badge.is-lit').waitFor();
    assert.equal(await page.locator('.streak-header-badge').textContent(), '1');
    const holiday = page.locator('.week-day[data-date="2026-11-02"]');
    assert.match(await holiday.getAttribute('class'), /holiday/);
    assert.match(await holiday.getAttribute('aria-label'), /Finados/);
    assert.equal(await holiday.locator('strong').evaluate(el => getComputedStyle(el).color), 'rgb(196, 61, 78)');
    await holiday.click();
    await page.getByText('Finados · Feriado, a chama está protegida.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.getByRole('button', { name: 'Histórico', exact: true }).click();
    for (const day of ['02', '15', '20']) {
      const cell = page.locator(`.calendar-day[data-date="2026-11-${day}"]`);
      assert.match(await cell.getAttribute('class'), /holiday/);
      assert.equal(await cell.locator('strong').evaluate(el => getComputedStyle(el).color), 'rgb(196, 61, 78)');
    }
    assert.doesNotMatch(await page.locator('.calendar-day[data-date="2026-11-03"]').getAttribute('class'), /holiday/);
    await page.locator('.calendar-day[data-date="2026-11-20"]').click();
    await page.getByText(/Consciência Negra · Feriado, a chama está protegida/).waitFor();
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    fs.mkdirSync('artifacts/holidays', { recursive: true });
    await page.locator('.training-calendar').screenshot({ path: path.resolve('artifacts/holidays/calendar.png') });
    assert.deepEqual(errors, []);
    console.log('PASS: holiday preserved shared flame, red home/month dates, holiday names and responsive calendar.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
