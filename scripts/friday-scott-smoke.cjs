const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});await context.route('**/api/streaks', route => route.abort());
  const page=await context.newPage(),errors=[];
  await page.addLocatorHandler(page.locator('.streak-celebration'), async () => { await page.locator('.streak-celebration').getByRole('button',{name:'Continuar',exact:true}).click(); });page.on('pageerror',e=>errors.push(e.message));
 const output=path.resolve('artifacts/friday-scott');fs.mkdirSync(output,{recursive:true});
 const settings=()=>page.getByRole('button',{name:'Abrir ajustes',exact:true}).click();
 const backup=async name=>{await settings();const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar backup',exact:true}).click();const file=path.join(output,name+'.json');await(await wait).saveAs(file);return JSON.parse(fs.readFileSync(file,'utf8'));};
 const friday=()=>page.getByRole('button',{name:'Abrir treino Costas + bíceps (E)',exact:true});
 try{
  await page.goto(process.env.APP_URL||'http://127.0.0.1:4174/gym-tracker/');await page.getByRole('heading',{name:'Seus treinos',exact:true}).waitFor();assert.match(await friday().locator('img').getAttribute('src'),/exercise-10.webp/);
  const original=await backup('original');const fixture=structuredClone(original);delete fixture.data.brunoFridayRevision;
  fixture.data.workouts[4].image=36;Object.assign(fixture.data.workouts[4].exercises[4],{id:'incline-curl',name:'Rosca inclinada com halteres',image:28});
  fixture.data.weights['incline-curl']=18;fixture.data.weights['preacher-curl']=25;
  const workout=fixture.data.workouts[4];fixture.data.active={id:'ongoing-before-update',workoutId:workout.id,workoutName:workout.name,startedAt:Date.now()-600000,exercises:workout.exercises.map(e=>({exerciseId:e.id,name:e.name,image:e.image,muscle:e.muscle,target:e.target,kind:e.kind,weight:fixture.data.weights[e.id]||0,done:e.id==='incline-curl'?[true,false,false]:[false,false,false]}))};
  fixture.data.history=[{...structuredClone(fixture.data.active),id:'historical-before-update',startedAt:Date.now()-3600000,finishedAt:Date.now()-3000000}];
  const file=path.join(output,'legacy.json');fs.writeFileSync(file,JSON.stringify(fixture));await page.locator('input[type=file]').setInputFiles(file);await page.getByRole('button',{name:'Substituir e restaurar',exact:true}).click();
  assert.match(await friday().locator('img').getAttribute('src'),/exercise-10.webp/);
  const migrated=await backup('migrated');assert.equal(migrated.data.workouts[4].exercises[4].id,'preacher-curl');assert.deepEqual(migrated.data.history,fixture.data.history);assert.deepEqual(migrated.data.active,fixture.data.active);assert.deepEqual(migrated.data.weights,fixture.data.weights);
  await page.getByRole('button',{name:'Treinos',exact:true}).click();await page.locator('.resume-banner').click();await page.getByRole('textbox',{name:'Carga de Rosca inclinada com halteres',exact:true}).waitFor();
  await page.getByRole('button',{name:'Descartar treino em andamento',exact:true}).click();await page.getByRole('button',{name:'Descartar sessão',exact:true}).click();await friday().click();
  assert.equal(await page.getByRole('textbox',{name:'Carga de Rosca Scott',exact:true}).inputValue(),'25');assert.equal(await page.getByRole('textbox',{name:'Carga de Rosca inclinada com halteres',exact:true}).count(),0);assert.equal(await page.locator('.exercise-row').count(),6);
  await page.locator('.exercise-image').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  await page.getByRole('button',{name:'Ampliar imagem de Pulldown com braços estendidos',exact:true}).click();assert.match(await page.locator('.image-preview-viewport img').getAttribute('src'),/exercise-9.webp/);await page.locator('.image-preview-viewport img').evaluate(img=>img.decode());await page.getByRole('button',{name:'Fechar',exact:true}).click();
  await page.screenshot({path:path.join(output,'friday-scott-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'Treinos',exact:true}).click();await page.getByRole('button',{name:'Abrir treino Ombros, peito + tríceps',exact:true}).click();await page.getByRole('button',{name:'Ampliar imagem de Tríceps na polia com barra',exact:true}).click();await page.locator('.image-preview-viewport img').evaluate(img=>img.decode());await page.getByRole('button',{name:'Fechar',exact:true}).click();
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await friday().click();assert.equal(await page.getByRole('textbox',{name:'Carga de Rosca Scott',exact:true}).inputValue(),'25');await page.locator('.exercise-image').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));assert.deepEqual(errors,[]);
  console.log('PASS: Friday Scott cover/selection, current load identity, migration of existing installs, preserved ongoing/history snapshots, distinct illustration zooms and offline cache.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
