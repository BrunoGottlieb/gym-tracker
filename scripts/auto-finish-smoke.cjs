const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 await context.route('**/api/streaks', route => route.abort());
  const page=await context.newPage(),errors=[];
  await page.addLocatorHandler(page.locator('.streak-celebration'), async () => { await page.locator('.streak-celebration').getByRole('button',{name:'Continuar',exact:true}).click(); });page.on('pageerror',e=>errors.push(e.message));
 const output=path.resolve('artifacts/auto-finish');fs.mkdirSync(output,{recursive:true});
 const settings=()=>page.getByRole('button',{name:'Abrir ajustes',exact:true}).click();
 const complete=()=>page.getByRole('dialog',{name:'Treino completo. Mandou bem!',exact:true});
 const backup=async()=>{await settings();const p=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar backup',exact:true}).click();const f=path.join(output,'backup.json');await(await p).saveAs(f);return JSON.parse(fs.readFileSync(f,'utf8'));};
 const restore=async data=>{await settings();const file=path.join(output,'fixture.json');fs.writeFileSync(file,JSON.stringify(data));await page.locator('input[type=file]').setInputFiles(file);await page.getByRole('button',{name:'Substituir e restaurar',exact:true}).click();};
 try{
  await page.goto(process.env.APP_URL||'http://127.0.0.1:4174/gym-tracker/');
  await page.getByRole('button',{name:'Abrir treino Peito + tríceps',exact:true}).click();
  const rows=page.locator('.exercise-row');
  // Complete in reverse exercise order; add a fourth series to the first exercise.
  await rows.first().getByRole('button',{name:/Adicionar série/}).click();
  for(let i=5;i>0;i--){await rows.nth(i).locator('.set-button').last().click();assert.equal(await complete().count(),0);}
  await rows.first().locator('.set-button').nth(2).click();assert.equal(await complete().count(),0);
  await rows.first().locator('.set-button').last().click();await complete().waitFor();
  assert.equal(await page.locator('.exercise-complete').count(),6);
  await page.getByRole('button',{name:'Continuar treino',exact:true}).click();
  await page.getByRole('textbox',{name:'Carga de Supino reto com barra',exact:true}).fill('42');
  await page.waitForTimeout(500);assert.equal(await complete().count(),0);
  await rows.first().locator('.set-button').last().click();assert.equal(await complete().count(),0);
  await rows.first().locator('.set-button').last().click();await complete().waitFor();
  await page.getByRole('button',{name:'Continuar treino',exact:true}).click();
  await page.getByText('Salvo no aparelho',{exact:true}).waitFor();await page.reload();await page.locator('.resume-banner').click();
  assert.equal(await complete().count(),0);
  // Removing the sole extra unfinished series also makes all entries complete.
  await rows.first().getByRole('button',{name:/Adicionar série/}).click();
  await rows.first().getByRole('button',{name:/Remover série/}).click();await complete().waitFor();
  await page.getByRole('button',{name:'Salvar e finalizar',exact:true}).click();
  const base=await backup();assert.equal(base.data.history.length,1);assert.equal(base.data.active,null);
  // A first tap may complete a one-exercise, one-series routine, including switching.
  const fixture=structuredClone(base);fixture.data.history=[];fixture.data.selectedPlan='ivan';fixture.data.workouts=fixture.data.workouts.slice(0,2);
  for(const w of fixture.data.workouts){w.exercises=w.exercises.slice(0,1);w.exercises[0].sets=1;}
  await restore(fixture);
  await page.getByRole('button',{name:'Abrir treino Peito + tríceps',exact:true}).click();await rows.first().locator('.set-button').click();await complete().waitFor();
  await page.getByRole('button',{name:'Continuar treino',exact:true}).click();await page.getByRole('button',{name:'Treinos',exact:true}).click();
  await page.getByRole('button',{name:'Abrir treino Costas + bíceps',exact:true}).click();await rows.first().locator('.set-button').click();
  await page.getByRole('button',{name:'Descartar e trocar',exact:true}).click();await complete().waitFor();
  await page.getByRole('button',{name:'Salvar e finalizar',exact:true}).click();
  const saved=await backup();assert.equal(saved.data.history.length,1);assert.match(saved.data.history[0].workoutName,/Costas/);
  assert.deepEqual(errors,[]);console.log('PASS: automatic completion in any order, cumulative and extra series, dismissal, no reopen on load/weight edits, removal, first-action completion and confirmed session switch.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
