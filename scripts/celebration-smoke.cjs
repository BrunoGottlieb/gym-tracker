const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Sao_Paulo'});
 const output=path.resolve('artifacts/celebration');fs.mkdirSync(output,{recursive:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let snapshot={version:1,today:'2026-10-31',dates:[{person:'original',date:'2026-10-28'},{person:'sheet',date:'2026-10-29'},{person:'original',date:'2026-10-30'},{person:'ivan',date:'2026-10-31'}],trainingDays:{original:[1,2,3,4,5],sheet:[1,2,3,4,5],ivan:[1,2,3,5,6]}};
 await context.route('**/api/streaks',route=>route.fulfill({json:route.request().method()==='POST'?{ok:true,accepted:route.request().postDataJSON().events.map(e=>e.id)}:snapshot}));
 const screen=page.getByRole('dialog',{name:/manteve a|mantiveram a/});
 const close=()=>screen.getByRole('button',{name:'Continuar',exact:true}).click();
 try{
  await page.clock.install({time:new Date('2026-10-31T12:00:00-03:00')});
  await page.goto(process.env.APP_URL||'http://127.0.0.1:4174/gym-tracker/');
  await screen.waitFor();assert.match(await screen.locator('h1').textContent(),/Ivan/);assert.match(await screen.locator('.celebration-count').textContent(),/4 treinos/);
  assert.equal(await screen.locator('.celebration-preview').count(),0);
  await page.waitForTimeout(1800);await page.screenshot({path:path.join(output,'mobile.png')});
  const savedData=()=>page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('gym-tracker');r.onsuccess=()=>resolve(r.result);r.onerror=reject;});const val=await new Promise((resolve,reject)=>{const r=db.transaction('state').objectStore('state').get('main');r.onsuccess=()=>resolve(r.result);r.onerror=reject;});db.close();return JSON.stringify(val);});
  const before=await savedData();
  await screen.getByRole('button',{name:'Repetir animação',exact:true}).click();assert.equal(await screen.locator('.celebration-stage').getAttribute('data-replay'),'1');
  const animations=await screen.locator('.celebration-flame-arrival').evaluate(el=>el.getAnimations().map(a=>({name:a.animationName,state:a.playState})));assert.ok(animations.some(a=>a.name==='flame-arrive'));
  await page.waitForTimeout(1800);
  for(const size of[{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1280,height:900}]){await page.setViewportSize(size);assert.equal(await screen.evaluate(el=>el.scrollWidth>el.clientWidth),false,'dialog overflow '+size.width);await screen.getByRole('button',{name:'Continuar',exact:true}).scrollIntoViewIfNeeded();}
  await page.setViewportSize({width:390,height:844});await close();await screen.waitFor({state:'detached'});
  assert.equal(await page.locator('.shared-streak-count strong').textContent(),'4');
  await page.reload();await page.getByText(/Atualizado às/).first().waitFor();assert.equal(await screen.count(),0,'should not automatically repeat on reload');
  await page.getByRole('button',{name:'Abrir ajustes',exact:true}).click();
  assert.equal(await page.locator('.streak-settings').evaluate(el=>el.nextElementSibling.textContent.includes('Seus dados')),true);
  await page.getByRole('button',{name:'Ver animação da chama',exact:true}).click();await screen.waitFor();await screen.getByText('Prévia da animação',{exact:true}).waitFor();await close();
  // Advancing a Brasília day permits one fresh automatic celebration.
  snapshot={...snapshot,today:'2026-11-01',dates:[...snapshot.dates,{person:'sheet',date:'2026-11-01'}]};
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00-03:00'));
  await page.getByRole('button',{name:'Sincronizar agora',exact:true}).click();await screen.waitFor();assert.match(await screen.locator('h1').textContent(),/Nick/);assert.match(await screen.locator('.celebration-count').textContent(),/5 treinos/);await close();
  await page.getByRole('button',{name:'Treinos',exact:true}).click();
  // Multiple contributors receive accurate attribution without double-counting.
  snapshot={...snapshot,dates:[...snapshot.dates,{person:'ivan',date:'2026-11-01'}]};await page.getByRole('button',{name:'Sincronizar sequências',exact:true}).click();await page.getByText('Nick e Ivan mantiveram a chama acesa hoje.',{exact:true}).waitFor();assert.equal(await screen.count(),0);
  await page.getByRole('button',{name:'Ver animação da chama',exact:true}).click();await screen.waitFor();assert.match(await screen.locator('h1').textContent(),/Nick e Ivanmantiveram/);await close();
  await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Ver animação da chama',exact:true}).click();await screen.waitFor();assert.equal(await screen.locator('.celebration-flame-arrival').evaluate(el=>getComputedStyle(el).animationName),'none');await close();
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await page.locator('.shared-streak-count').waitFor();assert.equal(await page.locator('.shared-streak-count strong').textContent(),'5');await page.getByRole('button',{name:'Ver animação da chama',exact:true}).click();await screen.waitFor();await close();
  assert.equal(await savedData(),before,'celebration and previews must not mutate workout data');
  await context.setOffline(false);
  const empty=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Sao_Paulo'});await empty.route('**/api/streaks',r=>r.fulfill({json:r.request().method()==='POST'?{ok:true,accepted:[]}: {...snapshot,dates:[]}}));const p3=await empty.newPage();await p3.goto(process.env.APP_URL||'http://127.0.0.1:4174/gym-tracker/');await p3.getByText(/Atualizado às/).first().waitFor();assert.equal(await p3.locator('.streak-celebration').count(),0);await p3.getByRole('button',{name:'Ver animação da chama',exact:true}).click();await p3.getByText('Prévia da animação',{exact:true}).waitFor();assert.match(await p3.locator('.celebration-count').textContent(),/0 treinos/);await empty.close();
  assert.deepEqual(errors,[]);console.log('PASS: shared count, daily auto celebration, correct people, replay restarts animation, reload suppression, next day, previews, reduced motion, offline access and responsive layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
