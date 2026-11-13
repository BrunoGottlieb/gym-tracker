const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await c.route('**/api/avatars',r=>r.abort());await c.route('**/api/streaks', r => r.abort());
    await c.route('**/api/backups?*', r => r.abort());
    const p = await c.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    const state = () => p.evaluate(() => new Promise(resolve => {
      const r = indexedDB.open('gym-tracker'); r.onsuccess = () => {
        const db = r.result, q = db.transaction('state').objectStore('state').get('main');
        q.onsuccess = () => { resolve(q.result.value); db.close(); };
      };
    }));
    await p.goto(process.env.APP_URL || 'http://127.0.0.1:4176/gym-tracker/');
    await p.getByRole('button', { name: 'Abrir ajustes', exact: true }).click();
    await p.getByRole('switch', { name: /Iniciar ao concluir uma série/ }).check();
    await p.getByRole('button', { name: 'Treinos', exact: true }).click();
    await p.locator('.workout-tile[data-workout=home]').click();
    await p.getByRole('button', { name: 'Iniciar sustentação', exact: true }).click();
    await p.getByRole('button', { name: /Parar e registrar/ }).click();
    await p.waitForTimeout(200);
    let s = await state();
    assert.equal(s.active.exercises[0].done[0], true);
    assert.equal(s.timer.started, true);
    assert.equal(s.timer.exercise, 'Tuck front lever');
    const end = s.timer.endAt;
    const first = p.getByRole('spinbutton', { name: 'Segundos da série 1 de Tuck front lever', exact: true });
    await first.fill('20'); await first.blur();
    await p.waitForTimeout(200); assert.equal((await state()).timer.endAt, end);
    for (const width of [320, 390, 768]) {
      await p.setViewportSize({ width, height: 844 });
      const layout = await p.locator('.hold-recorder').evaluate(el => ({
        width: el.getBoundingClientRect().width, row: el.parentElement.getBoundingClientRect().width,
        overflow: el.scrollWidth > el.clientWidth,
        fieldsOverflow: el.querySelector('.hold-values').scrollWidth > el.querySelector('.hold-values').clientWidth,
      }));
      assert.ok(Math.abs(layout.width - layout.row) < 2);
      assert.equal(layout.overflow, false); assert.equal(layout.fieldsOverflow, false);
    }
    for (let i = 0; i < 5; i++) await p.getByRole('button', { name: 'Adicionar série de Tuck front lever', exact: true }).click();
    await p.setViewportSize({ width: 320, height: 844 });
    assert.equal(await p.locator('.hold-values').evaluate(el => el.scrollWidth > el.clientWidth), false);
    fs.mkdirSync('artifacts/hold-rest', { recursive: true });
    await p.locator('.has-hold').screenshot({ path: 'artifacts/hold-rest/mobile.png' });
    await p.getByRole('button', { name: 'Abrir ajustes', exact: true }).click();
    await p.getByRole('switch', { name: /Iniciar ao concluir uma série/ }).uncheck();
    await p.getByRole('button', { name: 'Treinos', exact: true }).click();
    await p.locator('.workout-tile[data-workout=home]').click();
    const second = p.getByRole('spinbutton', { name: 'Segundos da série 2 de Tuck front lever', exact: true });
    await second.fill('15'); await second.blur(); await p.waitForTimeout(200);
    s = await state(); assert.equal(s.active.exercises[0].seconds[1], 15); assert.equal(s.timer.endAt, end);
    assert.deepEqual(errors, []);
    console.log('PASS: timed hold starts rest; editing and disabled auto-rest preserve timer; full-width mobile panel wraps extra sets.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
