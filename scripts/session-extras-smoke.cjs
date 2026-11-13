const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 const cloud=new Map();let writes=0;
 async function context(){const c=await browser.newContext({viewport:{width:390,height:844}});await c.route('**/api/avatars',r=>r.abort());await c.route('**/api/streaks',r=>r.abort());await c.route('**/api/backups?*',async r=>{
  const person=new URL(r.request().url()).searchParams.get('person'),saved=cloud.get(person);
  if(r.request().method()==='GET')return r.fulfill({json:saved??{revision:null}});
  const body=r.request().postDataJSON();if((saved?.revision??null)!==body.expectedRevision)return r.fulfill({status:409,json:{}});
  writes++;const data={revision:String(writes),payload:body.payload,updatedAt:new Date().toISOString()};cloud.set(person,data);return r.fulfill({json:{revision:data.revision,updatedAt:data.updatedAt}});
 });return c;}
 const c=await context(),p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const state=()=>p.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('gym-tracker');r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('main');q.onsuccess=()=>{resolve(q.result.value);db.close()};q.onerror=reject;};}));
 try{
 await p.goto('http://127.0.0.1:4174/gym-tracker/');for(const width of [390,768,1280]){await p.setViewportSize({width,height:844});const a=await p.locator('.workout-tile[data-workout=a] .workout-cover').boundingBox(),h=await p.locator('.workout-tile[data-workout=home] .workout-cover').boundingBox();assert.ok(Math.abs(a.height-h.height)<1,'Equal cover height at '+width);}await p.setViewportSize({width:390,height:844});await p.locator('.workout-tile[data-workout=home]').click();
 assert.equal(await p.locator('.hold-recorder').count(),1);
 await p.getByRole('button',{name:'Iniciar sustentação',exact:true}).click();await p.waitForTimeout(2150);await p.reload();await p.locator('.workout-tile[data-workout=home]').click();await p.getByRole('button',{name:/Parar e registrar/}).click();
 assert.ok((await state()).active.exercises[0].seconds[0]>=2);
 const seconds=p.getByRole('spinbutton',{name:'Segundos da série 2 de Tuck front lever',exact:true});await seconds.fill('14');await seconds.blur();assert.equal((await state()).active.exercises[0].seconds[1],14);
 await p.getByRole('button',{name:'Finalizar treino',exact:true}).click();await p.getByRole('button',{name:'Salvar e finalizar',exact:true}).click();
 await p.getByRole('button',{name:'Treinos',exact:true}).click();await p.locator('.workout-tile[data-workout=a]').click();await p.locator('.exercise-row').first().getByRole('button',{name:'Trocar só hoje',exact:true}).click();
 await p.getByRole('searchbox',{name:'Buscar exercício'}).fill('remada baixa');await p.getByRole('button',{name:/^Selecionar: Remada baixa/}).click();
 let s=await state();assert.equal(s.active.exercises[0].exerciseId,'cable-row');assert.equal(s.workouts[0].exercises[0].id,'bench-press');assert.equal(s.history[0].exercises[0].seconds[1],14);
 await p.getByRole('button',{name:'Concluir série 1 de Remada baixa na polia',exact:true}).click();assert.equal(await p.locator('.exercise-row').first().getByRole('button',{name:'Trocar só hoje'}).isDisabled(),true);
 await p.waitForTimeout(2600);assert.ok(cloud.get('original'));assert.equal(JSON.parse(cloud.get('original').payload).data.active.exercises[0].exerciseId,'cable-row');
 const before=writes,c2=await context(),p2=await c2.newPage();await p2.goto('http://127.0.0.1:4174/gym-tracker/');await p2.getByRole('button',{name:'Abrir ajustes',exact:true}).click();await p2.getByText('Há um backup na nuvem.',{exact:false}).waitFor();await p2.waitForTimeout(2500);assert.equal(writes,before,'Fresh device must not overwrite existing cloud backup');
 p2.once('dialog',d=>d.accept());await p2.getByRole('button',{name:'Restaurar da nuvem',exact:true}).click();await p2.waitForTimeout(700);await p2.getByRole('button',{name:'Treinos',exact:true}).click();await p2.locator('.workout-tile[data-workout=a]').click();assert.equal(await p2.locator('.exercise-row h2').first().textContent(),'Remada baixa na polia');
 assert.deepEqual(errors,[]);console.log('PASS: hold clock survives reload, manual seconds, history, temporary swap, unchanged plan, automatic cloud backup, fresh-device conflict and restoration.');await c2.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
