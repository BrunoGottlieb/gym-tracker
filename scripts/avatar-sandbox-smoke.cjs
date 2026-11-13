const assert = require('node:assert/strict'), fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const appURL = process.env.APP_URL || 'http://127.0.0.1:4177/gym-tracker/';
const out = 'artifacts/avatar-sandbox';
(async () => {
  const prep = require('node:child_process').spawnSync(process.execPath, ['scripts/prepare-avatar-sandbox-fixture.mjs'], { encoding: 'utf8' });
  assert.equal(prep.status, 0, prep.stderr);
  const fixtures = JSON.parse(fs.readFileSync(`${out}/fixtures.json`, 'utf8'));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  const errors = [], uploads = [];
  async function context(options) {
    const c = await browser.newContext(options);
    await c.route('**/api/streaks', r => r.fulfill({ json: r.request().method() === 'GET' ? { version: 1, today: '2026-11-13', dates: [], trainingDays: { original: [1,2,3,4,5], sheet: [1,2,3,4,5], ivan: [1,2,3,5,6] } } : { ok: true, accepted: [] } }));
    await c.route('**/api/backups?*', r => {
      const person = new URL(r.request().url()).searchParams.get('person');
      if (r.request().method() !== 'GET') uploads.push({ person, ...r.request().postDataJSON() });
      return r.fulfill({ json: { revision: 'fixture-' + person, payload: fixtures[person].payload, updatedAt: '2026-11-13T10:00:00Z' } });
    });
    return c;
  }
  async function read(page) {
    return page.evaluate(async () => {
      const db = await new Promise(resolve => { const q = indexedDB.open('gym-tracker'); q.onsuccess = () => resolve(q.result); });
      const row = await new Promise(resolve => { const q = db.transaction('state').objectStore('state').get('main'); q.onsuccess = () => resolve(q.result); });
      db.close(); return row.value;
    });
  }
  async function seed(page, person) {
    await page.goto(appURL); await page.locator('.game-dashboard').waitFor();
    await page.evaluate(async state => {
      const db = await new Promise(resolve => { const q = indexedDB.open('gym-tracker'); q.onsuccess = () => resolve(q.result); });
      const tx = db.transaction('state', 'readwrite'); tx.objectStore('state').put({ id: 'main', value: state });
      await new Promise(resolve => { tx.oncomplete = resolve; }); db.close();
    }, fixtures[person].state);
    await page.reload(); await page.locator('.game-dashboard').waitFor();
  }
  try {
    const desktop = await context({ viewport: { width: 1280, height: 950 } });
    const page = await desktop.newPage(); page.on('pageerror', e => errors.push(e.message));
    const click = name => page.getByRole('button', { name, exact: true }).click();
    await seed(page, 'original');
    assert.match(await page.locator('.game-level').innerText(), /Nível 1\s+0 XP/);
    await page.locator('.team-person[data-person=sheet]').filter({ hasText: 'Nível 1' }).waitFor();
    await page.locator('.team-person[data-person=ivan]').filter({ hasText: `Nível ${Math.floor(fixtures.ivan.xp/500)+1}` }).waitFor();
    await page.locator('.game-level .avatar-waist-up').waitFor();
    assert.ok((await page.locator('.level-emblem').boundingBox()).height >= 100);
    assert.equal(await page.locator('.team-person .avatar-waist-up').count(), 3);
    const before = await read(page), countBefore = uploads.length;
    await click('Perfil'); assert.equal(await page.getByRole('switch', { name: 'Modo sandbox neste aparelho' }).count(), 0); await page.goto(appURL + '#avatar-sandbox-local'); await click('Perfil'); assert.equal(await page.getByRole('switch', { name: 'Modo sandbox neste aparelho' }).isChecked(), true);
    await click('Personalizar avatar'); await click('Equipamentos');
    for (const category of ['Cabeça', 'Rosto', 'Bigode', 'Roupa', 'Extra']) { await click(category); assert.equal(await page.locator('.equipment-grid button:disabled').count(), 0); }
    await click('Cabeça'); await click('Coroa dourada'); await click('Rosto'); await click('Óculos de estrela'); await click('Bigode'); await click('Bigode de respeito'); await click('Roupa'); await click('Jaqueta de couro'); await click('Extra'); await click('Relógio esportivo');
    await page.locator('.customizer-preview img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
    await page.screenshot({ path: `${out}/sandbox.png` }); await click('Concluído');
    assert.deepEqual(await read(page), before); assert.equal(uploads.length, countBefore);
    await click('Abrir ajustes');
    assert.equal(await page.locator('.aura-options button:disabled').count(), 0);
    for (const name of ['Brilho âmbar', 'Brilho violeta', 'Brilho menta', 'Brilho dourado']) {
      await page.locator('.aura-options button').filter({ hasText: name }).click();
      assert.equal(await page.locator('.aura-options button.equipped strong').innerText(), name);
    }
    await click('Ver animação da chama');
    assert.equal(await page.locator('.celebration-stage').evaluate(el => el.style.getPropertyValue('--reward-aura')), '#FFDA61');
    await page.waitForTimeout(3500); // Capture the glow after the entrance has settled.
    await page.screenshot({ path: `${out}/golden-glow.png` });
    await page.locator('.streak-celebration').getByRole('button', { name: 'Continuar', exact: true }).click();
    assert.deepEqual(await read(page), before); assert.equal(uploads.length, countBefore);
    await page.reload(); await click('Perfil'); assert.equal(await page.locator('.profile-miniature').getAttribute('data-avatar-head'), 'crown');
    await click('Abrir ajustes'); assert.equal(await page.locator('.aura-options button.equipped strong').innerText(), 'Brilho dourado'); await click('Perfil');
    await page.getByRole('switch', { name: 'Modo sandbox neste aparelho' }).uncheck();
    assert.equal(await page.locator('.profile-miniature').getAttribute('data-avatar-head'), 'none');
    await click('Personalizar avatar'); await click('Equipamentos'); assert.equal(await page.getByRole('button', { name: 'Coroa dourada, desbloqueia no nível 24', exact: true }).isDisabled(), true); await click('Concluído');
    await page.getByRole('switch', { name: 'Modo sandbox neste aparelho' }).check();
    await page.locator('.team-person[data-person=sheet]').click(); assert.equal(await page.locator('.profile-page').getAttribute('data-profile-person'), 'original');
    await click('Treinos'); await page.evaluate(() => scrollTo(0, 0));
    await page.locator('.game-dashboard img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
    await page.screenshot({ path: `${out}/desktop-home.png`, fullPage: true });
    for (const width of [320,390,768,1280]) { await page.setViewportSize({ width, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); }
    await desktop.close();

    const mobile = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await mobile.newPage(); phone.on('pageerror', e => errors.push(e.message));
    for (const person of ['original', 'sheet', 'ivan']) {
      await seed(phone, person); const before = await read(phone);
      const level = Math.floor(fixtures[person].xp / 500) + 1;
      assert.match(await phone.locator('.game-level').innerText(), new RegExp(`Nível ${level}\\s+${fixtures[person].xp.toLocaleString('pt-BR')} XP`));
      await phone.getByRole('button', { name: 'Perfil', exact: true }).click(); assert.equal(await phone.getByRole('switch', { name: 'Modo sandbox neste aparelho' }).count(), 0);
      if (person === 'original') { await phone.getByRole('button', { name: 'Abrir ajustes', exact: true }).click(); assert.equal(await phone.locator('.aura-options button:disabled').count(), 4); }
      await phone.getByRole('button', { name: 'Treinos', exact: true }).click();
      await phone.screenshot({ path: `${out}/${person}-home.png`, fullPage: true });
      if (person !== 'original') for (const workout of fixtures[person].state.workouts) {
        await phone.locator(`.workout-tile[data-workout="${workout.id}"]`).click();
        const expected = fixtures[person].motions[workout.id];
        assert.equal(await phone.locator('.exercise-row').count(), workout.exercises.length);
        for (let i = 0; i < expected.length; i++) {
          const row = phone.locator('.exercise-row').nth(i), motion = expected[i];
          assert.equal(await row.locator('.exercise-motion').count(), motion ? 1 : 0);
          if (motion) {
            await phone.waitForFunction(({ i, motion }) => document.querySelectorAll('.exercise-row')[i].querySelector('img').src.includes(`/motion/${motion}-`), { i, motion });
            // Decode a fixed snapshot: the live demonstration can switch frames
            // during network loading, which intentionally aborts img.decode().
            await row.locator(`.exercise-motion[data-motion="${motion}"] img`).evaluate(img => {
              const snapshot = new Image(); snapshot.src = img.currentSrc || img.src; return snapshot.decode();
            });
          }
        }
        await phone.screenshot({ path: `${out}/${person}-${workout.id}.png`, fullPage: true });
        await phone.getByRole('button', { name: 'Treinos', exact: true }).click();
      }
      assert.deepEqual(await read(phone), before);
    }
    await phone.evaluate(async () => { await navigator.serviceWorker.ready; }); await mobile.setOffline(true); await phone.reload();
    await phone.getByRole('button', { name: 'Perfil', exact: true }).click(); await phone.locator('.profile-miniature img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
    await mobile.close(); assert.deepEqual(errors, []);
    console.log('PASS: Bruno/Nick reset with preserved history and Ivan XP; explicitly authorized device-only sandbox, hidden and disabled elsewhere and isolated persisted previews; real level locks; expanded waist-up portraits at 320–1280px; all matching Nick/Ivan animations and covers; unchanged routines/loads/history; offline avatars.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
