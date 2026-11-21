const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
fs.mkdirSync('artifacts/weekly-review', { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    let cloudCalls = 0;
    await context.route('**/api/**', route => { cloudCalls++; return route.abort(); });
    await context.addInitScript(() => {
      localStorage.setItem('gym-tracker.avatar-sandbox.private-device.v1', '1');
      localStorage.setItem('gym-tracker.avatar-sandbox.v1', JSON.stringify({ enabled: false, avatars: {} }));
    });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const click = name => page.getByRole('button', { name, exact: true }).click();
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:4189/');
    await page.getByRole('complementary', { name: 'Sandbox neste PC' }).waitFor();
    await page.evaluate(async () => {
      const db = await new Promise(resolve => { const r = indexedDB.open('gym-tracker-sandbox'); r.onsuccess = () => resolve(r.result); });
      const tx = db.transaction('state', 'readwrite'), store = tx.objectStore('state');
      const row = await new Promise(resolve => { const r = store.get('main'); r.onsuccess = () => resolve(r.result); });
      const state = row.value, sunday = new Date(); sunday.setHours(0, 0, 0, 0); sunday.setDate(sunday.getDate() - sunday.getDay());
      const make = (id, day, sets) => {
        const finished = new Date(sunday); finished.setDate(finished.getDate() + day); finished.setHours(0, 1);
        return { id, person: 'original', xpRules: 2, workoutId: state.workouts[0].id, workoutName: 'Peito de teste', startedAt: +finished - 60000, finishedAt: +finished, exercises: [{ exerciseId: 'bench-press', name: 'Supino reto', image: 0, muscle: 'chest', target: '12', kind: 'reps', weight: 30, done: Array(sets).fill(true), plannedSets: 3 }] };
      };
      state.history = [make('review-one', 0, 4), make('review-two', 0, 3), make('review-old', -1, 3)];
      state.active = null;
      state.avatarWallets.original = { awards: { fixture: 500, 'review-one': 42, 'review-two': 38 }, purchases: {}, gifts: [] };
      store.put(row); await new Promise(resolve => tx.oncomplete = resolve); db.close();
    });
    await page.reload();
    const read = () => page.evaluate(async () => {
      const db = await new Promise(resolve => { const r = indexedDB.open('gym-tracker-sandbox'); r.onsuccess = () => resolve(r.result); });
      const state = await new Promise(resolve => { const r = db.transaction('state').objectStore('state').get('main'); r.onsuccess = () => resolve(r.result.value); }); db.close(); return state;
    });
    const balance = state => Object.values(state.avatarWallets.original.awards).reduce((a, b) => a + b, 0) - Object.values(state.avatarWallets.original.purchases).reduce((a, b) => a + b, 0);
    const before = await read();
    await click('Ver resumo semanal');
    await page.getByRole('heading', { name: 'Resumo semanal.' }).waitFor();
    assert.match(await page.locator('.review-rewards').innerText(), /80 moedas/);
    assert.equal(await page.locator('.review-numbers>div').first().innerText(), '2\ntreinos');
    assert.match(await page.locator('.review-muscle summary').innerText(), /7 séries/);
    await page.locator('.review-muscle summary').click();
    assert.match(await page.locator('.review-muscle ul').innerText(), /Supino reto/);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `artifacts/weekly-review/summary-${width}.png`, fullPage: true });
    }
    await click('Semana anterior');
    assert.equal(await page.locator('.review-session').count(), 1);
    await click('Próxima semana');
    assert.equal(await page.locator('.review-session').count(), 2);
    await click('Perfil'); await click('Personalizar avatar'); await click('Equipamentos'); await click('Boné azul');
    await click('Comprar e usar');
    const confirmation = page.getByRole('dialog', { name: 'Confirmar compra?' });
    await confirmation.waitFor(); assert.equal(balance(await read()), 580);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/weekly-review/purchase-confirmation.png' });
    await click('Voltar ao provador'); assert.equal(balance(await read()), 580);
    await click('Comprar e usar'); await page.keyboard.press('Escape');
    assert.equal(await confirmation.count(), 0); assert.equal(balance(await read()), 580);
    await click('Comprar e usar'); await click('Confirmar e pagar 3 moedas');
    await page.getByRole('button', { name: 'Personalizar avatar', exact: true }).waitFor();
    assert.equal(balance(await read()), 577);
    await page.reload(); await click('Perfil');
    assert.equal((await read()).avatars.original.head, 'cap');
    await click('Personalizar avatar'); await click('Salvar visual');
    assert.equal(await confirmation.count(), 0); assert.equal(balance(await read()), 577);
    assert.deepEqual((await read()).history, before.history);
    assert.equal(cloudCalls, 0); assert.deepEqual(errors, []);
    console.log('PASS: weekly actuals, historical navigation, muscle details, mobile layout; purchase confirmation, cancel, Escape, single charge, persistence, free re-equip; no real data or cloud writes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
