const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const appURL = process.env.APP_URL || 'http://127.0.0.1:4177/gym-tracker/';
const out = 'artifacts/avatar-shop'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Sao_Paulo' });
    // An isolated fake backend: never write to real user accounts.
    const uploads = [], remote = {};
    await context.route('**/api/streaks', r => r.fulfill({ json: r.request().method() === 'GET' ? { version: 1, today: '2026-11-13', dates: [], trainingDays: { original: [1, 2, 3, 4, 5], sheet: [1, 2, 3, 4, 5], ivan: [1, 2, 3, 5, 6] } } : { ok: true, accepted: [] } }));
    await context.route('**/api/backups?*', r => {
      const person = new URL(r.request().url()).searchParams.get('person');
      if (r.request().method() === 'GET') return r.fulfill({ json: remote[person] ?? { revision: null } });
      const body = r.request().postDataJSON(); uploads.push({ person, ...body });
      remote[person] = { revision: `test-${uploads.length}`, payload: body.payload, updatedAt: '2026-11-13T22:00:00Z' };
      return r.fulfill({ json: remote[person] });
    });
    const page = await context.newPage(), errors = []; page.setDefaultTimeout(10000);
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.install({ time: new Date('2026-11-13T19:00:00-03:00') });
    await page.addLocatorHandler(page.locator('.streak-celebration'), () => page.locator('.streak-celebration').getByRole('button', { name: 'Continuar', exact: true }).click());
    const click = name => page.getByRole('button', { name, exact: true }).click();
    async function read() {
      return page.evaluate(async () => {
        const db = await new Promise(resolve => { const q = indexedDB.open('gym-tracker'); q.onsuccess = () => resolve(q.result); });
        const value = await new Promise(resolve => { const q = db.transaction('state').objectStore('state').get('main'); q.onsuccess = () => resolve(q.result?.value ?? null); });
        db.close(); return value;
      });
    }
    const balance = state => Object.values(state.avatarWallets.original.awards).reduce((a, b) => a + b, 0) - Object.values(state.avatarWallets.original.purchases).reduce((a, b) => a + b, 0);
    await page.goto(appURL); await click('Perfil'); await click('Personalizar avatar');
    await click('Equipamentos');
    assert.equal(await page.locator('.equipment-grid>button').nth(1).getAttribute('aria-label'), 'Boné azul');
    await click('Rosto');
    assert.deepEqual(await page.locator('.equipment-grid>button').evaluateAll(buttons => buttons.slice(1).map(button => button.getAttribute('aria-label'))), ['Cicatriz', 'Brincos de argola', 'Tapa-olho', 'Monóculo dourado', 'Óculos de estrela', 'Óculos escuros', 'Óculos Turn Down for What']);
    await click('Cabeça'); await click('Coroa dourada');
    assert.equal(await page.getByRole('button', { name: 'Coroa dourada', exact: true }).isDisabled(), false);
    assert.equal(await page.getByRole('button', { name: 'Comprar e usar', exact: true }).isDisabled(), true);
    await page.getByText('Faltam 175 moedas', { exact: true }).waitFor();
    await page.screenshot({ path: `${out}/preview-insufficient.png` });
    console.log('Preview and insufficient funds OK');
    await click('Cancelar'); assert.equal((await read())?.avatars, undefined);
    // Earn coins through the normal workout-finalization UI.
    await click('Treinos'); await page.locator('.workout-tile[data-workout=a]').click();
    await page.locator('.exercise-row').first().getByRole('button', { name: /Concluir série 3/ }).click();
    assert.equal(balance(await read()), 0);
    await click('Finalizar treino');
    await page.getByRole('button', { name: 'Salvar e finalizar', exact: true }).click();
    await page.locator('.result-coins').filter({ hasText: '+8 moedas' }).waitFor();
    await click('Continuar'); console.log('Workout reward OK');
    await click('Perfil'); await click('Personalizar avatar'); await click('Equipamentos');
    await click('Faixa esportiva'); await click('Comprar e usar');
    const purchased = await read(); assert.equal(balance(purchased), 4); assert.equal(purchased.avatars.original.head, 'headband');
    assert.equal(purchased.avatarWallets.original.purchases['head:headband'], 4);
    await click('Personalizar avatar'); await click('Equipamentos'); await click('Sem acessório'); await click('Salvar visual');
    await click('Personalizar avatar'); await click('Equipamentos'); await click('Faixa esportiva'); await click('Salvar visual');
    assert.equal(balance(await read()), 4); console.log('Purchase and re-equip OK');
    // Populate a synthetic wallet for a whole-outfit purchase at level one.
    await page.evaluate(async () => {
      const db = await new Promise(resolve => { const q = indexedDB.open('gym-tracker'); q.onsuccess = () => resolve(q.result); });
      const tx = db.transaction('state', 'readwrite'), store = tx.objectStore('state');
      const row = await new Promise(resolve => { const q = store.get('main'); q.onsuccess = () => resolve(q.result); });
      row.value.avatarWallets.original.awards['fixture-earnings'] = 496;
      store.put(row); await new Promise(resolve => { tx.oncomplete = resolve; }); db.close();
    });
    await page.reload(); await click('Perfil'); const before = await read();
    await click('Personalizar avatar'); await click('Cabelo Afro, grátis'); await click('Equipamentos'); await click('Fones dourados');
    await click('Roupa'); await click('Camiseta de caveira'); await click('Rosto'); await click('Óculos de estrela'); await click('Extra'); await click('Gravata tradicional');
    assert.equal(await page.locator('.outfit-cart>div>span').count(), 4);
    await page.getByText('Saldo após a compra: 290', { exact: true }).waitFor();
    assert.deepEqual((await read()).avatars, before.avatars); assert.equal(balance(await read()), 500);
    for (const width of [320, 390, 600, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `page overflow ${width}`);
      assert.equal(await page.locator('.avatar-editor').evaluate(el => el.scrollWidth > el.clientWidth), false, `dialog overflow ${width}`);
      const box = await page.locator('.avatar-editor').boundingBox();
      if (width <= 600) { assert.equal(box.x, 0); assert.equal(box.width, width); }
      else assert.ok(Math.abs(box.x + box.width / 2 - width / 2) < 2);
    }
    console.log('Outfit draft and layout OK');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${out}/outfit-checkout.png` }); await click('Comprar e usar');
    const after = await read(); assert.equal(balance(after), 290);
    assert.deepEqual(after.history, before.history); assert.deepEqual(after.workouts, before.workouts);
    assert.equal(after.avatars.original.head, 'headphones'); assert.equal(after.avatars.original.shirt, 'skull-tee');
    await page.waitForTimeout(2500);
    assert.ok(uploads.some(u => JSON.parse(u.payload).data.avatarWallets?.original?.purchases['head:headphones'] === 65));
    for (const upload of uploads) assert.deepEqual(Object.keys(JSON.parse(upload.payload).data.avatarWallets), ['original']);
    await page.reload(); await click('Perfil'); assert.equal(balance(await read()), 290);
    await page.locator('.team-person[data-person=sheet]').click(); assert.equal(await page.locator('.profile-page').getAttribute('data-profile-person'), 'original');
    assert.equal(await page.getByRole('switch', { name: 'Modo sandbox neste aparelho', exact: true }).count(), 0);
    await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true); await page.reload(); await click('Perfil'); await click('Personalizar avatar');
    await page.locator('.customizer-preview img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
    await click('Cabelo Comprido, grátis'); await click('Salvar visual'); assert.equal((await read()).avatars.original.hair, 'long');
    assert.equal(balance(await read()), 290); assert.deepEqual(errors, []);
    console.log('PASS: finish awards coins, zero-cost full-outfit preview/cancel, insufficient funds, atomic purchase at level one, reuse without charge, profile isolation, cloud wallet scope, persistence/offline and mobile layouts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
