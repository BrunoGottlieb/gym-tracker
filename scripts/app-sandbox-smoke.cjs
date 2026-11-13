const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const appURL = process.env.APP_URL || 'http://127.0.0.1:4178/gym-tracker/';
const out = 'artifacts/app-sandbox'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Sao_Paulo' });
    let calls = [];
    await context.route('**/api/**', route => { calls.push(route.request().url()); return route.abort(); });
    const page = await context.newPage(), errors = []; page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-11-13T19:00:00-03:00') });
    await page.addLocatorHandler(page.locator('.streak-celebration'), () => page.locator('.streak-celebration').getByRole('button', { name: 'Continuar', exact: true }).click());
    const click = name => page.getByRole('button', { name, exact: true }).click();
    async function dump(name) {
      return page.evaluate(async name => {
        const db = await new Promise((resolve, reject) => { const q = indexedDB.open(name); q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error); });
        const result = { version: db.version };
        for (const store of db.objectStoreNames) result[store] = await new Promise(resolve => { const q = db.transaction(store, 'readonly').objectStore(store).getAll(); q.onsuccess = () => resolve(q.result); });
        db.close(); return result;
      }, name);
    }
    await page.goto(appURL); await click('Perfil'); await click('Personalizar avatar'); await click('Cabelo Curto, grátis'); await click('Salvar visual');
    // All fixture writes below occur in this disposable browser, never the user's browser.
    await page.evaluate(async () => {
      const db = await new Promise(resolve => { const q = indexedDB.open('gym-tracker'); q.onsuccess = () => resolve(q.result); });
      const tx = db.transaction(['state', 'sync'], 'readwrite'), store = tx.objectStore('state');
      const row = await new Promise(resolve => { const q = store.get('main'); q.onsuccess = () => resolve(q.result); });
      row.value.weights['bench-press'] = 42;
      row.value.avatarWallets.original.awards['real-earned-fixture'] = 500;
      store.put(row); tx.objectStore('sync').put({ id: 'real-sync-sentinel', value: { untouched: true } });
      await new Promise(resolve => { tx.oncomplete = resolve; }); db.close();
    });
    const original = await dump('gym-tracker');
    // Activate from an already open real page: activation must reload before
    // allowing writes to any state or synchronization store.
    await page.goto(appURL + '#avatar-sandbox-local');
    await page.getByRole('complementary', { name: 'Sandbox neste PC' }).waitFor();
    await page.waitForTimeout(1500); calls = [];
    await page.evaluate(() => {
      const original = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function(names, mode, ...rest) {
        if (this.name === 'gym-tracker' && mode && mode !== 'readonly') throw Error('Attempted a real DB write from sandbox');
        return original.call(this, names, mode, ...rest);
      };
    });
    let sandbox = await dump('gym-tracker-sandbox');
    assert.deepEqual(sandbox.state, original.state);
    await click('Perfil');
    const preview = page.getByRole('switch', { name: 'Modo sandbox neste aparelho', exact: true });
    if (await preview.isChecked()) await preview.uncheck();
    assert.equal(await page.getByRole('complementary', { name: 'Sandbox neste PC' }).count(), 1);
    await click('Personalizar avatar'); await click('Equipamentos'); await click('Coroa dourada'); await click('Comprar e usar');
    await click('Treinos'); await page.locator('.workout-tile[data-workout=a]').click();
    await page.locator('.exercise-row').first().getByRole('button', { name: /Concluir série 3/ }).click();
    await click('Finalizar treino'); await click('Salvar e finalizar');
    await page.locator('.result-coins').filter({ hasText: '+8 moedas' }).waitFor();
    assert.match(await page.locator('.result-xp').textContent(), /80/);
    await page.screenshot({ path: `${out}/workout-result.png` });
    await click('Continuar');
    sandbox = await dump('gym-tracker-sandbox');
    const tested = sandbox.state.find(row => row.id === 'main').value;
    assert.equal(tested.history.length, 1); assert.equal(tested.avatars.original.head, 'crown');
    assert.equal(tested.avatarWallets.original.purchases['head:crown'], 175);
    assert.deepEqual(await dump('gym-tracker'), original);
    assert.deepEqual(calls, []);
    await click('Abrir ajustes'); assert.equal(await page.locator('.cloud-backup').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Sincronizar agora', exact: true }).isDisabled(), true);
    await page.clock.fastForward(65000);
    await page.evaluate(() => { dispatchEvent(new Event('online')); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(500); assert.deepEqual(calls, []);
    await page.reload(); await page.getByRole('complementary', { name: 'Sandbox neste PC' }).waitFor();
    assert.equal((await dump('gym-tracker-sandbox')).state[0].value.history.length, 1);
    assert.deepEqual(await dump('gym-tracker'), original); assert.deepEqual(calls, []);
    await click('Reiniciar testes');
    await page.getByText('Testes reiniciados a partir de uma cópia dos dados locais reais.', { exact: true }).waitFor();
    assert.deepEqual((await dump('gym-tracker-sandbox')).state, original.state);
    assert.deepEqual(await dump('gym-tracker'), original); assert.deepEqual(calls, []);
    for (const width of [320, 390, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); }
    await page.screenshot({ path: `${out}/sandbox-home.png`, fullPage: true });
    assert.deepEqual(errors, []);
    const regular = await browser.newContext({ viewport: { width: 390, height: 844 } });
    let normalRequests = 0; await regular.route('**/api/**', route => { normalRequests++; return route.abort(); });
    const normal = await regular.newPage(); await normal.goto(appURL); await normal.getByRole('button', { name: 'Perfil', exact: true }).click();
    assert.equal(await normal.getByRole('complementary', { name: 'Sandbox neste PC' }).count(), 0);
    await normal.waitForTimeout(1800); assert.ok(normalRequests > 0); await regular.close();
    console.log('PASS: private activation/reload; full sandbox workouts, coins, purchases, levels and streak; zero cloud requests; real DB and sync rows unchanged; persistence/reset; regular devices unaffected.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
