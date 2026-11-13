const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const appURL = process.env.APP_URL || 'http://127.0.0.1:4177/gym-tracker/';
const out = 'artifacts/avatar-fitting'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    await context.route('**/api/**', route => route.abort());
    const page = await context.newPage(), errors = [], missing = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && response.url().includes('/avatars/')) missing.push(response.url()); });
    const click = name => page.getByRole('button', { name, exact: true }).click();
    await page.goto(appURL + '#avatar-sandbox-local'); await click('Perfil'); await click('Personalizar avatar');
    const headFrames = [], clothingFrames = [];
    async function capture(label, frames) {
      await page.locator('.customizer-preview img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      frames.push({ label, html: await page.locator('.customizer-preview .avatar-art').evaluate(el => el.outerHTML) });
    }
    for (const [head, id] of [['Fones dourados', 'headphones'], ['Coroa dourada', 'crown']]) {
      await click('Equipamentos'); await click('Cabeça'); await click(head);
      for (const hair of ['Ondulado', 'Afro', 'Sem cabelo', 'Comprido']) {
        await click('Cabelo'); await click(`Cabelo ${hair}, grátis`);
        const avatar = page.locator('.customizer-preview .avatar-art');
        const order = await avatar.locator('[data-layer]').evaluateAll(layers => layers.map(layer => layer.getAttribute('data-layer')));
        assert.equal(order[0], 'head-back'); assert.ok(order.indexOf('base') > 0); assert.equal(order.at(-1), 'head');
        const front = avatar.locator('svg[data-layer=head]');
        assert.equal(await front.getAttribute('class'), `avatar-head-layer head-${id}`);
        assert.equal(await avatar.locator('[data-layer=head-back]').evaluate(el => +getComputedStyle(el).zIndex), 0);
        assert.ok(await front.evaluate(el => +getComputedStyle(el).zIndex) > 1);
        await capture(`${head} · ${hair}`, headFrames);
      }
    }
    await click('Cabelo'); await click('Cabelo Ondulado, grátis'); await click('Equipamentos'); await click('Cabeça'); await click('Sem acessório'); await click('Roupa');
    for (const shirt of ['Regata azul', 'Camiseta de caveira', 'Jaqueta de couro']) { await click(shirt); await capture(shirt, clothingFrames); }
    await click('Regata azul'); await click('Extra'); await click('Gravata tradicional');
    assert.match(await page.locator('.customizer-preview [data-layer=extra]').getAttribute('src'), /necktie-front-v2\.png$/);
    await capture('Gravata · somente nó e lâmina', clothingFrames);
    const styles = await page.evaluate(() => [...document.styleSheets].map(style => style.href).filter(Boolean));
    async function gallery(frames, name, columns = 4) {
      const gallery = await context.newPage();
      await gallery.setViewportSize({ width: 1280, height: 450 });
      await gallery.setContent(`<html><head><base href="${appURL}">${styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')}<style>body{margin:0;padding:16px;background:#f7f8fd}.gallery{display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));gap:12px}.card{background:white;border:1px solid #dfe7fa;border-radius:20px;padding:10px}.card h2{font:600 13px sans-serif;text-align:center;color:#45639f;margin:0 0 10px}.frame{position:relative;height:360px;overflow:hidden;border-radius:14px;background:#e4edff}.frame>.avatar-art{position:absolute;left:50%;top:-25px;width:560px;height:560px;transform:translateX(-50%)}</style></head><body><div class="gallery">${frames.map(({ label, html }, i) => `<section class="card"><h2>${label}</h2><div class="frame">${html.replace(/id="([^"]+)"/g, (_, id) => `id="copy-${i}-${id}"`).replace(/url\(#([^)]+)\)/g, (_, id) => `url(#copy-${i}-${id})`)}</div></section>`).join('')}</div></body></html>`);
      await gallery.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      await gallery.screenshot({ path: `${out}/${name}.png`, fullPage: true }); await gallery.close();
    }
    await gallery(headFrames, 'headgear'); await gallery(clothingFrames, 'shoulders-and-tie');
    await gallery([...headFrames.filter(frame => frame.label.endsWith('· Ondulado')), ...clothingFrames.filter(frame => frame.label !== 'Regata azul')], 'summary', 5);
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    console.log('PASS: crown underside/far headphone cup behind head across four haircuts; near cup and arch in front; raised clothes and front-only tie; no missing images or browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
