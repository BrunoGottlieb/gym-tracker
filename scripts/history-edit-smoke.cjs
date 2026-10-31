const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true,timezoneId:'America/Sao_Paulo'});
 await context.route('**/api/streaks', route => route.abort());
  const page=await context.newPage(),errors=[];
  await page.addLocatorHandler(page.locator('.streak-celebration'), async () => { await page.locator('.streak-celebration').getByRole('button',{name:'Continuar',exact:true}).click(); });page.on('pageerror',e=>errors.push(e.message));
 const output=path.resolve('artifacts/history-edit');fs.mkdirSync(output,{recursive:true});
 const settings=()=>page.getByRole('button',{name:'Abrir ajustes',exact:true}).click();
 const backup=async name=>{await settings();const p=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar backup',exact:true}).click();const f=path.join(output,name+'.json');await(await p).saveAs(f);return JSON.parse(fs.readFileSync(f,'utf8'));};
 const openEdit=async()=>{await page.getByRole('button',{name:'Histórico',exact:true}).click();await page.locator('.history-row').first().click();await page.getByRole('button',{name:'Editar este treino',exact:true}).click();};
 try{
  await page.goto(process.env.APP_URL||'http://127.0.0.1:4174/gym-tracker/');
  await page.getByRole('button',{name:'Abrir treino Pernas',exact:true}).click();
  assert.deepEqual(await page.locator('.exercise-row h2').allTextContents(),['Leg press 45°','Cadeira extensora','Cadeira flexora','Panturrilha sentado na máquina','Leg press horizontal com banco móvel','Agachamento no squat articulado']);
  await page.locator('.exercise-image').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  await page.getByRole('button',{name:'Treinos',exact:true}).click();await page.getByRole('button',{name:'Abrir treino Peito + tríceps',exact:true}).click();
  await page.getByRole('textbox',{name:'Carga de Supino reto com barra',exact:true}).fill('60');
  await page.getByRole('button',{name:'Concluir série 3 de Supino reto com barra',exact:true}).click();
  await page.getByRole('button',{name:'Finalizar treino',exact:true}).click();await page.getByRole('button',{name:'Salvar e finalizar',exact:true}).click();
  await page.getByRole('button',{name:'Treinos',exact:true}).click();await page.getByRole('button',{name:'Abrir treino Costas + bíceps (B)',exact:true}).click();await page.getByRole('button',{name:'Concluir série 1 de Puxada alta (pulley)',exact:true}).click();
  const original=await backup('before');
  await openEdit();await page.getByLabel('Nome do treino registrado',{exact:true}).fill('Descartar esta edição');
  await page.getByRole('button',{name:'Cancelar edição',exact:true}).click();await page.getByRole('button',{name:'Fechar',exact:true}).click();
  assert.deepEqual((await backup('cancelled')).data,original.data);
  await openEdit();
  await page.getByLabel('Nome do treino registrado',{exact:true}).fill('Peito corrigido');
  await page.getByLabel('Início',{exact:true}).fill('2026-10-15T09:00');await page.getByLabel('Término',{exact:true}).fill('2026-10-15T08:00');
  await page.getByRole('button',{name:'Salvar registro',exact:true}).click();await page.getByText('O término precisa ser igual ou posterior ao início.',{exact:true}).waitFor();
  await page.getByLabel('Término',{exact:true}).fill('2026-10-15T10:00');
  const first=page.locator('.history-editor-exercise').first();
  await first.getByLabel('Carga registrada (kg)',{exact:true}).fill('37.5');await first.getByLabel('Meta registrada',{exact:true}).fill('8–10');
  await first.getByRole('button',{name:/Adicionar série registrada/}).click();await first.locator('.set-button').last().click();await first.locator('.set-button').nth(2).click();
  await page.getByRole('button',{name:'Adicionar exercício ao registro',exact:true}).click();await page.getByRole('searchbox',{name:'Buscar exercício',exact:true}).fill('leg press horizontal');await page.getByRole('button',{name:'Selecionar: Leg press horizontal com banco móvel',exact:true}).click();
  await page.locator('.history-editor-exercise').last().locator('.set-button').nth(1).click();
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});const overflow=await page.getByRole('dialog').evaluate(el=>el.scrollWidth>el.clientWidth);if(overflow){console.log(await page.getByRole('dialog').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,elements:[...el.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>el.getBoundingClientRect().right).map(e=>({tag:e.tagName,cls:e.className,w:e.getBoundingClientRect().width})).slice(0,15)})));await page.screenshot({path:path.join(output,'overflow.png')});}assert.equal(overflow,false);}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'history-editor-mobile.png')});
  await page.getByRole('button',{name:'Salvar registro',exact:true}).click();await page.getByRole('dialog',{name:'Peito corrigido',exact:true}).waitFor();await page.getByRole('button',{name:'Fechar',exact:true}).click();
  const saved=await backup('saved');
  assert.deepEqual(saved.data.weights,original.data.weights);assert.deepEqual(saved.data.active,original.data.active);assert.deepEqual(saved.data.workouts,original.data.workouts);
  const record=saved.data.history[0];assert.equal(record.exercises[0].weight,37.5);assert.deepEqual(record.exercises[0].done,[true,true,false,true]);assert.equal(record.exercises.at(-1).image,65);assert.equal(record.exercises.length,7);assert.equal(record.id,original.data.history[0].id);assert.equal(record.finishedAt,Date.parse('2026-10-15T10:00:00-03:00'));
  await page.getByText('Salvo no aparelho',{exact:true}).waitFor();await page.reload();
  await page.getByRole('button',{name:'Histórico',exact:true}).click();assert.match(await page.locator('.history-row').first().textContent(),/Peito corrigido/);assert.equal(await page.locator('[data-date="2026-10-15"].has-training').count(),1);
  await page.getByRole('button',{name:'Evolução',exact:true}).click();await page.getByLabel('Escolha um exercício').selectOption('bench-press');assert.match(await page.locator('.load-summary').textContent(),/37,5 kg/);assert.match(await page.locator('.load-summary').textContent(),/60 kg/);
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await openEdit();await page.getByLabel('Nome do treino registrado',{exact:true}).fill('Peito offline');await page.getByRole('button',{name:'Salvar registro',exact:true}).click();await page.getByRole('dialog',{name:'Peito offline',exact:true}).waitFor();
  assert.deepEqual(errors,[]);console.log('PASS: new leg machines, history editing/cancellation, invalid dates, loads/series/catalog, unchanged current session and weights, calendar/progression, mobile layout, reload and offline saving.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
