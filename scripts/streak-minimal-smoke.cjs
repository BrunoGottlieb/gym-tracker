const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true}),errors=[];
 const out=path.resolve('artifacts/streak-minimal');fs.mkdirSync(out,{recursive:true});
 const make=async dates=>{
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Sao_Paulo'});
  const snapshot={version:1,today:'2026-10-31',dates,trainingDays:{original:[1,2,3,4,5],sheet:[1,2,3,4,5],ivan:[1,2,3,5,6]}};
  await c.route('**/api/streaks',async r=>{const body=r.request().method()==='POST'?r.request().postDataJSON():null;if(body)for(const e of body.events){if(e.completed&&!snapshot.dates.some(d=>d.person===e.person&&d.date===e.date))snapshot.dates.push({person:e.person,date:e.date});}await r.fulfill({json:body?{ok:true,accepted:body.events.map(e=>e.id)}:snapshot});});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:new Date('2026-10-31T12:00:00-03:00')});await p.goto(process.env.APP_URL||'http://127.0.0.1:4174/gym-tracker/');await p.locator('.streak-header-badge').waitFor();return {c,p,snapshot};
 };
 const finish=async p=>{await p.getByRole('button',{name:'Abrir treino Peito + tríceps',exact:true}).click();const rows=p.locator('.exercise-row');for(let i=0;i<await rows.count();i++)await rows.nth(i).locator('.set-button').last().click();await p.getByRole('button',{name:'Salvar e finalizar',exact:true}).click();await p.locator('.history-list').waitFor();};
 const dismiss=p=>p.locator('.streak-celebration').getByRole('button',{name:'Continuar',exact:true}).click();
 try{
  const a=await make([]),p=a.p;
  await p.locator('.streak-header-badge').click();await p.getByText('Ninguém ainda',{exact:true}).waitFor();assert.equal(await p.locator('.streak-mini-count strong').textContent(),'0');assert.equal(await p.locator('.streak-mini-modal button').count(),1);await p.getByRole('button',{name:'Fechar',exact:true}).click();
  await finish(p);await p.locator('.streak-celebration').waitFor();assert.match(await p.locator('.celebration-title').textContent(),/^Vocêmanteve a/);assert.match(await p.locator('.celebration-count').textContent(),/1 dia de chama/);
  await p.locator('.celebration-replay').click();assert.equal(await p.locator('.celebration-stage').getAttribute('data-replay'),'1');
  await p.locator('.celebration-stage').evaluate(el=>{for(const a of el.getAnimations({subtree:true})){a.pause();a.currentTime=4000;}});await p.screenshot({path:path.join(out,'you.png')});await dismiss(p);
  await p.locator('.streak-header-badge').click();await p.locator('.streak-mini-names').getByText('Bruno',{exact:true}).waitFor();assert.equal(await p.locator('.streak-mini-names span').count(),1);assert.equal(await p.locator('.streak-header-badge').textContent(),'1');await p.getByRole('button',{name:'Fechar',exact:true}).click();
  await p.getByRole('button',{name:'Treinos',exact:true}).click();await finish(p);assert.equal(await p.locator('.streak-celebration').count(),0,'a second workout today is not a new first completion');await p.reload();await p.locator('.streak-header-badge').waitFor();await p.waitForTimeout(500);assert.equal(await p.locator('.streak-celebration').count(),0);await a.c.close();
  const b=await make([{person:'sheet',date:'2026-10-31'},{person:'ivan',date:'2026-10-31'}]);await b.p.locator('.streak-celebration').waitFor();assert.match(await b.p.locator('.celebration-title').textContent(),/^Nick e Ivanmantiveram/);await dismiss(b.p);await b.p.locator('.streak-header-badge').click();
  assert.equal(await b.p.locator('.streak-mini-count strong').textContent(),'1');assert.deepEqual(await b.p.locator('.streak-mini-names span').allTextContents(),['Nick','Ivan']);assert.equal(await b.p.locator('.streak-header-badge').textContent(),'2');assert.equal(await b.p.locator('.streak-mini-modal').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(65, 97, 255)');await b.p.screenshot({path:path.join(out,'popup.png')});
  for(const width of[320,390,768,1280]){await b.p.setViewportSize({width,height:844});assert.equal(await b.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await b.p.locator('.streak-mini-modal').evaluate(el=>el.scrollWidth>el.clientWidth),false);}
  await b.p.getByRole('button',{name:'Fechar',exact:true}).click();await finish(b.p);assert.equal(await b.p.locator('.streak-celebration').count(),0,'others already kept the flame');await b.c.close();
  // Someone finishes while this browser still has an empty cached day.
  const d=await make([]);await d.p.getByRole('button',{name:'Abrir ajustes',exact:true}).click();await d.p.getByText(/Atualizado às/).first().waitFor();await d.p.getByRole('button',{name:'Treinos',exact:true}).click();d.snapshot.dates.push({person:'sheet',date:'2026-10-31'});await finish(d.p);await d.p.locator('.streak-celebration').waitFor();assert.doesNotMatch(await d.p.locator('.celebration-title').textContent(),/Você/);assert.match(await d.p.locator('.celebration-title').textContent(),/Bruno e Nick/);await dismiss(d.p);await d.c.close();
  assert.deepEqual(errors,[]);console.log('PASS: minimal blue popup, polished badge, contributor/day counts, first-finisher You, latest-cloud check, multiple opening names, repeat/reload suppression and mobile layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
