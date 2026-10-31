const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const code=fs.readFileSync('streak-cloud/.dev.vars','utf8').match(/STREAK_ROOM_CODE\s*=\s*"?([^"\r\n]+)/)[1];
 const api='http://127.0.0.1:5180/api/streaks',app=process.env.APP_URL||'http://127.0.0.1:4174/gym-tracker/';
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 const errors=[],contexts=[],ids=[];let posts=0;
 const get=async()=>{const r=await fetch(api,{headers:{Authorization:`Bearer ${code}`}});assert.equal(r.status,200);return r.json()};
 const wait=async predicate=>{for(let i=0;i<80;i++){if(await predicate())return;await new Promise(r=>setTimeout(r,150));}throw Error('Cloud assertion timeout')};
 const make=async()=>{const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Sao_Paulo'});contexts.push(c);await c.route('**/api/streaks',async route=>{const req=route.request();if(req.method()==='POST'){posts++;for(const e of req.postDataJSON().events||[])ids.push({id:e.id,person:e.person,date:e.date});}const response=await route.fetch({url:api});await route.fulfill({response});});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.addLocatorHandler(p.locator('.streak-celebration'),async()=>{await p.locator('.streak-celebration').getByRole('button',{name:'Continuar',exact:true}).click()});await p.goto(app);await p.locator('.workout-grid').waitFor();return[c,p]};
 const dismiss=async p=>{const d=p.locator('.streak-celebration');if(await d.count())await d.getByRole('button',{name:'Continuar',exact:true}).click()};
 const details=async p=>{await p.locator('.streak-header-badge').click();return p.getByRole('dialog',{name:'Chama do grupo',exact:true})};
 const closeDetails=p=>p.getByRole('dialog',{name:'Chama do grupo',exact:true}).getByRole('button',{name:'Fechar',exact:true}).click();
 const connect=async p=>{await p.getByRole('button',{name:'Abrir ajustes',exact:true}).click();await p.getByText(/Atualizado às/).first().waitFor();await p.getByRole('button',{name:'Treinos',exact:true}).click()};
 const count=async p=>{await details(p);const v=await p.locator('.streak-mini-count strong').textContent();await closeDetails(p);return v};
 const finish=async p=>{await p.getByRole('button',{name:'Abrir treino Peito + tríceps',exact:true}).click();const rows=p.locator('.exercise-row');for(let i=0;i<await rows.count();i++)await rows.nth(i).locator('.set-button').last().click();await p.getByRole('button',{name:'Salvar e finalizar',exact:true}).click();await p.locator('.history-list').waitFor();await p.waitForTimeout(200);await dismiss(p);await p.getByRole('button',{name:'Treinos',exact:true}).click()};
 try{
  const[c,p]=await make();await connect(p);assert.equal(await p.getByLabel('Código da sala',{exact:true}).count(),0);assert.equal(await p.locator('.streak-panel').count(),0);
  await finish(p);await wait(async()=> (await get()).dates.some(d=>d.person==='original'));
  assert.equal(await count(p),'1');
  const[,p2]=await make();await connect(p2);assert.equal(await count(p2),'1');
  await p.getByRole('button',{name:'Histórico',exact:true}).click();await p.locator('.history-row').first().click();await p.getByRole('button',{name:'Editar este treino',exact:true}).click();await p.locator('.history-editor-exercise').first().locator('.set-button').last().click();await p.getByRole('button',{name:'Salvar registro',exact:true}).click();await p.getByRole('button',{name:'Fechar',exact:true}).click();await wait(async()=> !(await get()).dates.some(d=>d.person==='original'));
  await p.getByRole('button',{name:'Treinos',exact:true}).click();await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await c.setOffline(true);await finish(p);await p.reload();await p.getByRole('button',{name:'Abrir ajustes',exact:true}).click();assert.match(await p.locator('.streak-settings').textContent(),/pendente/);await p.getByRole('button',{name:'Treinos',exact:true}).click();
  await c.setOffline(false);await wait(async()=> (await get()).dates.some(d=>d.person==='original'));await p.getByRole('button',{name:'Abrir ajustes',exact:true}).click();await p.getByRole('button',{name:'Sincronizar agora',exact:true}).click();await p.getByText(/Atualizado às/).first().waitFor();await p.getByRole('button',{name:'Treinos',exact:true}).click();
  const out=path.resolve('artifacts/streaks');fs.mkdirSync(out,{recursive:true});
  for(const width of[320,390,768,1280]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);}
  await p.setViewportSize({width:390,height:844});await p.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
  const before=posts;await p.reload();await connect(p);assert.equal(posts,before,'acknowledged events should not upload again');
  assert.deepEqual(errors,[]);console.log('PASS: two devices, saved completion, history revocation, offline finish/reload/retry, persistent acknowledgements, mobile widths and no runtime errors.');
 }finally{for(const c of contexts)await c.close();await browser.close();const events=[...new Map(ids.map(e=>[e.id,e])).values()].map(e=>({...e,completed:false}));if(events.length)await fetch(api,{method:'POST',headers:{Authorization:`Bearer ${code}`,'Content-Type':'application/json'},body:JSON.stringify({events})});}
})().catch(e=>{console.error(e);process.exitCode=1});
