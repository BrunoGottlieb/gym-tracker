const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const appURL = process.env.APP_URL || 'http://127.0.0.1:4178/gym-tracker/';
const out = 'artifacts/workout-result'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    async function scenario({ reduced = false, startXP = 480, name = 'level-up' } = {}) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Sao_Paulo', reducedMotion: reduced ? 'reduce' : 'no-preference' });
      let cloudCalls = 0;
      await context.route('**/api/**', route => { cloudCalls++; return route.abort(); });
      await context.addInitScript(() => {
        localStorage.setItem('gym-tracker.avatar-sandbox.private-device.v1', '1');
        localStorage.setItem('gym-tracker.avatar-sandbox.v1', JSON.stringify({ enabled: false, avatars: {} }));
      });
      const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.clock.install({ time: new Date('2026-11-13T19:00:00-03:00') });
      await page.addLocatorHandler(page.locator('.streak-celebration'), () => page.locator('.streak-celebration').getByRole('button', { name: 'Continuar', exact: true }).click());
      const click = button => page.getByRole('button', { name: button, exact: true }).click();
      await page.goto(appURL); await page.getByRole('complementary', { name: 'Sandbox neste PC' }).waitFor();
      await page.evaluate(async startXP => {
        const db = await new Promise(resolve => { const q = indexedDB.open('gym-tracker-sandbox'); q.onsuccess = () => resolve(q.result); });
        const tx = db.transaction('state', 'readwrite'), store = tx.objectStore('state');
        const row = await new Promise(resolve => { const q = store.get('main'); q.onsuccess = () => resolve(q.result); });
        const s = row.value, e = s.workouts[0].exercises[0], sets = (startXP - 50) / 10;
        s.history = [{ id: 'prior-test-workout', person: 'original', workoutId: s.workouts[0].id, workoutName: s.workouts[0].name, startedAt: Date.now() - 120000, finishedAt: Date.now() - 60000, exercises: [{ exerciseId: e.id, name: e.name, image: e.image, kind: e.kind, target: e.target, weight: 0, done: Array(sets).fill(true), plannedSets: sets }] }];
        s.avatars = { original: { hair: 'long', hairColor: 'brown', skin: 'peach', head: 'crown', shirt: 'skull-tee', extra: 'none' } };
        s.avatarWallets.original = { awards: { 'fixture-coins': 500 }, purchases: { 'head:crown': 175, 'shirt:skull-tee': 50 }, gifts: [] };
        store.put(row); await new Promise(resolve => { tx.oncomplete = resolve; }); db.close();
      }, startXP);
      await page.reload(); await page.getByRole('complementary', { name: 'Sandbox neste PC' }).waitFor();
      await page.locator('.workout-tile[data-workout=a]').click();
      await page.locator('.exercise-row').first().getByRole('button', { name: /Concluir série 3/ }).click();
      await click('Finalizar treino'); await click('Salvar e finalizar');
      const meter = page.getByRole('progressbar', { name: 'Progresso de XP após este treino', exact: true });
      await meter.waitFor();
      await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 20)));
      const value = async () => +(await meter.getAttribute('aria-valuenow'));
      assert.equal(await page.locator('.result-avatar .avatar-waist-up[data-avatar-head=crown]').count(), 1);
      assert.equal(await page.locator('.result-avatar [data-layer=shirt]').count(), 1);
      assert.match(await page.locator('.result-coins').textContent(), /8 moedas/);
      if (reduced) {
        assert.equal(await value(), 0); await page.getByText('Nível 2', { exact: true }).first().waitFor();
        assert.equal(await page.locator('.result-progress').getAttribute('data-complete'), 'true');
      } else if (startXP === 80) {
        assert.equal(await value(), 80);
        await page.clock.runFor(800); assert.ok(await value() > 80 && await value() < 160);
        await page.clock.runFor(1200); assert.equal(await value(), 160);
        assert.equal(await page.locator('.result-progress').getAttribute('data-complete'), 'true');
      } else {
        assert.equal(await value(), 480);
        await page.clock.runFor(600); assert.ok(await value() > 480 && await value() < 500);
        await page.screenshot({ path: `${out}/${name}-filling.png` });
        await page.clock.runFor(600); assert.equal(await value(), 500);
        await page.getByText('Nível completo!', { exact: true }).waitFor();
        await page.screenshot({ path: `${out}/${name}-full.png` });
        await page.clock.runFor(600); assert.ok(await value() > 0 && await value() < 60);
        await page.clock.runFor(1200); assert.equal(await value(), 60);
        assert.equal(await page.locator('.result-progress').getAttribute('data-complete'), 'true');
      }
      await page.locator('.result-avatar img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      await page.screenshot({ path: `${out}/${name}-final.png` });
      for (const width of [320, 390, 768, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(await page.locator('.result-modal').evaluate(el => el.scrollWidth > el.clientWidth), false);
        assert.equal(await page.getByRole('button', { name: 'Continuar', exact: true }).isVisible(), true);
      }
      const state = await page.evaluate(async () => {
        const db = await new Promise(resolve => { const q = indexedDB.open('gym-tracker-sandbox'); q.onsuccess = () => resolve(q.result); });
        const value = await new Promise(resolve => { const q = db.transaction('state').objectStore('state').get('main'); q.onsuccess = () => resolve(q.result.value); }); db.close(); return value;
      });
      assert.equal(state.history.length, 2); assert.equal(cloudCalls, 0); assert.deepEqual(errors, []);
      await context.close();
    }
    await scenario(); await scenario({ startXP: 80, name: 'same-level' }); await scenario({ reduced: true, startXP: 420, name: 'reduced-motion-exact-level' });
    console.log('PASS: current waist-up outfit, real previous XP, intermediate fill/full/rollover and exact final XP, reduced-motion exact boundary, coins/history unchanged, sandbox isolation and 320–1280px layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
