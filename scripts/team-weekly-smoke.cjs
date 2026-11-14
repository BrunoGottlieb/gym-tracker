const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const appURL = process.env.APP_URL || 'http://127.0.0.1:4178/gym-tracker/';
const out = 'artifacts/team-weekly'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  const profiles = {}, posts = []; let backupPosts = 0;
  try {
    async function phone(person) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Sao_Paulo' });
      await context.route('**/api/avatars', async route => {
        if (route.request().method() === 'GET') return route.fulfill({ json: { version: 1, profiles: Object.values(profiles) } });
        const body = route.request().postDataJSON(); posts.push(body);
        const old = profiles[body.person], accepted = !old || body.changedAt > old.changedAt || (body.changedAt === old.changedAt && JSON.stringify(body.avatar) === JSON.stringify(old.avatar));
        if (accepted) profiles[body.person] = { ...body, updatedAt: new Date().toISOString() };
        return route.fulfill({ json: { ok: true, accepted, profile: profiles[body.person] } });
      });
      // Whole-backup unavailability must not prevent sharing the avatar.
      await context.route('**/api/backups?*', route => { if (route.request().method() === 'POST') backupPosts++; return route.fulfill({ status: 503, json: { error: 'backup unavailable' } }); });
      await context.route('**/api/streaks', route => route.fulfill({ json: route.request().method() === 'GET' ? { version: 1, today: '2026-11-13', dates: [], trainingDays: { original: [1, 2, 3, 4, 5], sheet: [1, 2, 3, 4, 5], ivan: [1, 2, 3, 5, 6] } } : { ok: true, accepted: route.request().postDataJSON().events.map(e => e.id) } }));
      const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.clock.install({ time: new Date('2026-11-13T19:00:00-03:00') });
      await page.addLocatorHandler(page.locator('.streak-celebration'), () => page.locator('.streak-celebration').getByRole('button', { name: 'Continuar', exact: true }).click());
      const click = name => page.getByRole('button', { name, exact: true }).click();
      await page.goto(appURL);
      if (person === 'sheet') {
        await click('Abrir ajustes'); await page.locator('.routine-plan-option').filter({ has: page.getByText('Nick', { exact: true }) }).click(); await click('Usar esta ficha');
      }
      await click('Perfil'); return { context, page, click, errors };
    }
    const until = async condition => { for (let i = 0; i < 60; i++) { if (condition()) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw Error('Avatar did not synchronize'); };
    const bruno = await phone('original'), nick = await phone('sheet');
    await bruno.click('Personalizar avatar'); await bruno.click('Cabelo Comprido, grátis'); await bruno.click('Salvar visual');
    await nick.click('Personalizar avatar'); await nick.click('Cabelo Afro, grátis'); await nick.click('Salvar visual');
    await until(() => profiles.original?.avatar.hair === 'long' && profiles.sheet?.avatar.hair === 'afro');
    await bruno.click('Atualizar níveis da equipe'); await nick.click('Atualizar níveis da equipe');
    await bruno.page.locator('.team-person[data-person=sheet] [data-avatar-hair=afro]').waitFor();
    await nick.page.locator('.team-person[data-person=original] [data-avatar-hair=long]').waitFor();
    await bruno.page.getByText('Avatar compartilhado com a equipe.', { exact: true }).waitFor();
    assert.equal(backupPosts, 0);
    delete profiles.original; await bruno.click('Atualizar níveis da equipe');
    await until(() => profiles.original?.avatar.hair === 'long');
    await nick.context.setOffline(true); await nick.click('Personalizar avatar'); await nick.click('Cabelo Coque, grátis'); await nick.click('Salvar visual');
    await nick.page.locator('.avatar-share-offline').waitFor();
    assert.equal(profiles.sheet.avatar.hair, 'afro');
    await nick.context.setOffline(false); await until(() => profiles.sheet?.avatar.hair === 'bun');
    await bruno.click('Atualizar níveis da equipe'); await bruno.page.locator('.team-person[data-person=sheet] [data-avatar-hair=bun]').waitFor();
    await bruno.page.screenshot({ path: `${out}/team-sync.png`, fullPage: true });
    // Populate only this disposable phone's local history to verify weekly
    // exercise counts, independent of the current plan and suggested weekday.
    await bruno.page.evaluate(async () => {
      const db = await new Promise(resolve => { const q = indexedDB.open('gym-tracker'); q.onsuccess = () => resolve(q.result); });
      const tx = db.transaction('state', 'readwrite'), store = tx.objectStore('state');
      const row = await new Promise(resolve => { const q = store.get('main'); q.onsuccess = () => resolve(q.result); });
      const sample = row.value.workouts[0].exercises[0], groups = { chest: 3, back: 2, legs: 7, shoulders: 2, biceps: 2, triceps: 3, abs: 1 };
      const logs = Object.entries(groups).flatMap(([muscle, count]) => Array.from({ length: count }, (_, i) => ({ exerciseId: `fixture-${muscle}-${i}`, name: `Exercício ${muscle} ${i}`, image: sample.image, target: '12', kind: 'reps', weight: 10, muscle, done: [true, true, true] })));
      logs[0].exerciseId = 'bench-press'; logs[0].name = 'Supino reto com barra'; logs[0].done = [true,true,true,true,true,true];
      logs.push({ ...logs[0], exerciseId: 'partial-exercise', name: 'Flexão de braços (parcial)', done: [true, false, false] });
      const session = { id: 'weekly-fixture', workoutId: 'a', workoutName: 'Treino de teste', person: 'original', startedAt: Date.parse('2026-11-11T18:00:00-03:00'), finishedAt: Date.parse('2026-11-11T19:00:00-03:00'), exercises: logs };
      row.value.history = [session, { ...session, id: 'other-profile', person: 'sheet' }, { ...session, id: 'old-week', startedAt: Date.parse('2026-11-07T18:00:00-03:00'), finishedAt: Date.parse('2026-11-07T19:00:00-03:00') }];
      store.put(row); await new Promise(resolve => { tx.oncomplete = resolve; }); db.close();
    });
    await bruno.page.reload();
    const list = bruno.page.locator('.weekly-actual-list'); await list.waitFor();
    for (const [group, count] of Object.entries({ chest: 13, back: 6, legs: 21, shoulders: 6, biceps: 6, triceps: 9, abs: 3 })) assert.equal(await list.locator(`tr[data-muscle=${group}]`).getAttribute('data-sets'), String(count));
    assert.match(await list.locator('tr[data-muscle=chest] .weekly-actual-planned').textContent(), /5.*15 séries/);
    assert.match(await list.locator('tr[data-muscle=chest] .weekly-actual-count').textContent(), /4,33/);
    await list.getByRole('button', { name: /^Detalhar Peito:/ }).click();
    await bruno.page.locator('.weekly-volume-exercise[data-exercise=bench-press]').filter({ hasText: '+3 séries' }).waitFor();
    await bruno.page.locator('.weekly-volume-exercise[data-exercise=pec-deck]').filter({ hasText: 'Ainda não feito' }).waitFor();
    await bruno.page.locator('.volume-extra').filter({ hasText: 'Fora da ficha' }).first().waitFor();
    await bruno.page.locator('.weekly-volume-exercise[data-exercise=bench-press] summary').click();
    await bruno.page.locator('.weekly-volume-exercise[data-exercise=bench-press] li').filter({ hasText: '6 séries' }).waitFor();
    await bruno.page.screenshot({ path: `${out}/weekly-details.png` });
    await bruno.click('Fechar');
    await list.screenshot({ style: '.bottom-nav{visibility:hidden}', path: `${out}/weekly-list.png` });
    await bruno.page.locator('.weekly-muscle-summary').screenshot({ style: '.bottom-nav{visibility:hidden}', path: `${out}/weekly-section.png` });
    for (const width of [320, 390, 768, 1280]) { await bruno.page.setViewportSize({ width, height: 844 }); assert.equal(await bruno.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); }
    await bruno.page.clock.fastForward(2 * 86400000);
    await bruno.page.waitForFunction(() => [...document.querySelectorAll('.weekly-actual-list tr[data-completed]')].every(row => row.getAttribute('data-completed') === '0'));
    assert.deepEqual(bruno.errors, []); assert.deepEqual(nick.errors, []);
    assert.ok(posts.every(body => Object.keys(body).sort().join(',') === 'avatar,changedAt,person,xp'));
    console.log('PASS: two phones share avatar updates independently of blocked backups; offline retry and read-only teammates; weekly completed exercises by actual profile/date, partial exclusion, week reset and mobile layouts.');
    await bruno.context.close(); await nick.context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
