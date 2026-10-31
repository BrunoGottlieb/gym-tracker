const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true,timezoneId:'America/Sao_Paulo'});
 await context.route('**/api/streaks', route => route.abort());
  const page=await context.newPage(), errors=[];
  await page.addLocatorHandler(page.locator('.streak-celebration'), async () => { await page.locator('.streak-celebration').getByRole('button',{name:'Continuar',exact:true}).click(); });page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-11-01T12:00:00-03:00')});
 const output=path.resolve('artifacts/ivan-smoke');fs.mkdirSync(output,{recursive:true});
 const settings=()=>page.getByRole('button',{name:'Abrir ajustes',exact:true}).click();
 const choose=async name=>{await settings();await page.locator('.routine-plan-option').filter({has:page.getByText(name,{exact:true})}).click();await page.getByRole('button',{name:'Usar esta ficha',exact:true}).click();};
 const backup=async name=>{const w=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar backup',exact:true}).click();const f=path.join(output,name+'.json');await(await w).saveAs(f);return JSON.parse(fs.readFileSync(f,'utf8'));};
 try{
  await page.goto(process.env.APP_URL||'http://127.0.0.1:4174/gym-tracker/');
  await page.getByRole('heading',{name:'Seus treinos',exact:true}).waitFor();
  assert.match(await page.locator('.week-day').first().textContent(),/^DOM/);
  assert.equal(await page.locator('.week-day').first().getAttribute('data-date'),'2026-11-01');
  await settings();const original=await backup('original');
  assert.deepEqual(await page.locator('.routine-plan-option strong').allTextContents(),['Bruno','Nick','Ivan']);
  await choose('Ivan');
  assert.deepEqual(await page.locator('.workout-caption p').allTextContents(),['Segunda · 5 exercícios','Terça · 6 exercícios','Quarta · 6 exercícios','Sexta · 7 exercícios','Sábado · 7 exercícios']);
  await page.getByRole('button',{name:/Abrir treino Push/}).click();
  assert.equal(await page.locator('.exercise-row').count(),5);
  assert.equal(await page.locator('.exercise-row').nth(3).locator('.set-button').count(),5);
  await page.getByRole('button',{name:'Concluir série 5 de Elevação lateral com halteres',exact:true}).click();
  await page.getByText('Salvo no aparelho',{exact:true}).waitFor();await page.reload();await page.locator('.resume-banner').click();
  assert.equal(await page.locator('.exercise-row').nth(3).locator('.set-button[aria-pressed=true]').count(),5);
  await page.getByRole('button',{name:'Descartar treino em andamento',exact:true}).click();await page.getByRole('button',{name:'Descartar sessão',exact:true}).click();
  await settings();await page.getByRole('button',{name:/Editar Push/}).click();
  assert.equal(await page.getByLabel('Séries',{exact:true}).nth(3).inputValue(),'5');
  await page.getByLabel('Nome do treino',{exact:true}).fill('Push do Ivan');await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  const ivan=await backup('ivan');
  assert.deepEqual(ivan.data.workouts.map(w=>w.exercises.reduce((s,e)=>s+e.sets,0)),[19,19,18,21,21]);
  await choose('Nick');await settings();assert.equal((await backup('nick')).data.workouts[0].exercises.length,8);
  await choose('Bruno');await settings();assert.deepEqual((await backup('bruno')).data.workouts,original.data.workouts);
  await choose('Ivan');await settings();const returned=await backup('returned');assert.equal(returned.data.workouts[0].name,'Push do Ivan');
  // Sunday's weekly total must exclude the preceding Saturday.
  const workout=returned.data.workouts[0];
  const session=(id,finished)=>({id,workoutId:workout.id,workoutName:workout.name,startedAt:finished-60000,finishedAt:finished,exercises:workout.exercises.map(e=>({exerciseId:e.id,name:e.name,image:e.image,muscle:e.muscle,kind:e.kind,target:e.target,done:Array(e.sets).fill(true),weight:0}))});
  returned.data.history=[session('saturday',Date.parse('2026-10-31T12:00:00-03:00')),session('sunday',Date.parse('2026-11-01T10:00:00-03:00'))];
  const file=path.join(output,'week-boundary.json');fs.writeFileSync(file,JSON.stringify(returned));await page.locator('input[type=file]').setInputFiles(file);await page.getByRole('button',{name:'Substituir e restaurar',exact:true}).click();
  assert.equal(await page.locator('.week-total').textContent(),'1 treino concluído');
  await page.getByRole('button',{name:'Histórico',exact:true}).click();
  assert.deepEqual(await page.locator('.calendar-weekdays span').allTextContents(),['DOM','SEG','TER','QUA','QUI','SEX','SÁB']);
  assert.equal(await page.locator('.calendar-blank').count(),0);
  await page.getByRole('button',{name:'Mês anterior',exact:true}).click();assert.equal(await page.locator('.calendar-blank').count(),4);
  await page.screenshot({path:path.join(output,'sunday-calendar.png'),fullPage:true});
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();
  for(const title of ['Push do Ivan','Pull · Costas, bíceps + ombros','Legs · Pernas + abdômen','Upper · Superior completo','Lower · Pernas + abdômen']){
   await page.getByRole('button',{name:'Treinos',exact:true}).click();await page.getByRole('button',{name:'Abrir treino '+title,exact:true}).click();
   await page.locator('.exercise-image').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
   for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  }
  assert.deepEqual(errors,[]);console.log('PASS: Ivan schedule, series and totals, persisted edits, legacy Bruno/Nick, offline images, phone widths and Sunday weekly/monthly boundaries.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
