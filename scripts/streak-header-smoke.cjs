const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true}),errors=[];
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Sao_Paulo'});
 let snapshot={version:1,today:'2026-10-31',dates:[],trainingDays:{original:[1,2,3,4,5],sheet:[1,2,3,4,5],ivan:[1,2,3,5,6]}};
 await context.route('**/api/streaks',r=>r.fulfill({json:r.request().method()==='POST'?{ok:true,accepted:r.request().postDataJSON().events.map(e=>e.id)}:snapshot}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-31T12:00:00-03:00')});
 const out=path.resolve('artifacts/streak-header');fs.mkdirSync(out,{recursive:true});
 const badge=page.locator('.streak-header-badge'),popup=page.getByRole('dialog',{name:'Quem manteve a chama?',exact:true}),celebration=page.locator('.streak-celebration');
 try{
  await page.goto(process.env.APP_URL||'http://127.0.0.1:4174/gym-tracker/');await badge.waitFor();assert.equal(await page.locator('.streak-panel').count(),0);assert.equal(await badge.textContent(),'0');assert.equal(await badge.evaluate(el=>el.classList.contains('is-lit')),false);
  const gray=await badge.locator('.flame-outer').evaluate(el=>getComputedStyle(el).fill);
  await badge.click();await popup.waitFor();assert.equal(await popup.locator('.shared-streak-people>.done').count(),0);await popup.getByRole('button',{name:'Fechar',exact:true}).click();
  for(const width of[320,390,768,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await badge.isVisible());}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'gray.png')});
  snapshot={...snapshot,dates:[{person:'ivan',date:'2026-10-31'},{person:'sheet',date:'2026-10-31'},{person:'ivan',date:'2026-10-31'}]};
  await badge.click();await popup.getByRole('button',{name:'Sincronizar sequências',exact:true}).click();await popup.getByText('Nick e Ivan mantiveram a chama acesa hoje.',{exact:true}).waitFor();assert.equal(await badge.textContent(),'2');assert.equal(await popup.locator('.shared-streak-people>.done').count(),2);assert.notEqual(await badge.locator('.flame-outer').evaluate(el=>getComputedStyle(el).fill),gray);
  await page.screenshot({path:path.join(out,'participants.png')});await popup.getByRole('button',{name:'Fechar',exact:true}).click();await celebration.waitFor();
  const flight=celebration.locator('.celebration-flame-arrival');assert.equal(await flight.evaluate(el=>el.getAnimations()[0].effect.getKeyframes().some(k=>k.transform.includes('rotateY'))),false);
  await celebration.getByRole('button',{name:'Repetir animação',exact:true}).click();assert.equal(await celebration.locator('.celebration-stage').getAttribute('data-replay'),'1');
  const poses=[];
  for(const time of[3000,3800,4500]){
   await celebration.locator('.celebration-stage').evaluate((el,t)=>{for(const a of el.getAnimations({subtree:true})){a.pause();a.currentTime=t;}},time);
   poses.push(await flight.locator('svg').evaluate(el=>getComputedStyle(el).transform));
  }
  assert.ok(new Set(poses).size>1,'idle flame must keep changing size');
  assert.ok(await celebration.locator('.celebration-halo').evaluate(el=>el.getAnimations().some(a=>a.animationName==='flame-aura')));
  await page.screenshot({path:path.join(out,'flame-glow.png')});await celebration.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.screenshot({path:path.join(out,'lit.png')});
  await page.reload();await badge.waitFor();await badge.click();await popup.getByText('Nick e Ivan mantiveram a chama acesa hoje.',{exact:true}).waitFor();assert.equal(await celebration.count(),0);await popup.getByRole('button',{name:'Ver animação da chama',exact:true}).click();await celebration.waitFor();await celebration.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByRole('button',{name:'Abrir ajustes',exact:true}).click();assert.equal(await page.locator('.streak-settings').evaluate(el=>el.nextElementSibling.textContent.includes('Seus dados')),true);await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Ver animação da chama',exact:true}).click();await celebration.waitFor();assert.equal(await flight.locator('svg').evaluate(el=>getComputedStyle(el).animationName),'none');await celebration.getByRole('button',{name:'Continuar',exact:true}).click();
  // Reset today's badge at Brasília midnight, and allow one celebration on the new date.
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00-03:00'));snapshot={...snapshot,today:'2026-11-01'};
  await badge.click();await popup.getByRole('button',{name:'Sincronizar sequências',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.streak-header-badge').textContent==='0');assert.equal(await badge.evaluate(el=>el.classList.contains('is-lit')),false);
  snapshot={...snapshot,dates:[...snapshot.dates,{person:'sheet',date:'2026-11-01'}]};await popup.getByRole('button',{name:'Sincronizar sequências',exact:true}).click();await popup.getByText('Nick manteve a chama acesa hoje.',{exact:true}).waitFor();await popup.getByRole('button',{name:'Fechar',exact:true}).click();await celebration.waitFor();assert.match(await celebration.locator('h1').textContent(),/Nick/);await celebration.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await badge.waitFor();await badge.click();await popup.getByText('Nick manteve a chama acesa hoje.',{exact:true}).waitFor();assert.equal(await badge.textContent(),'1');assert.equal(await celebration.count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: no home card; responsive gray/colored badge; unique contributor count; named popup; daily celebration; upright flight; continuous size pulse/aura; replay; settings and reduced motion.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
