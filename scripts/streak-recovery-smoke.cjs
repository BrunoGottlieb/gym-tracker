const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});try{
 const p=await b.newPage();let snapshot={version:1,today:new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}),dates:[],trainingDays:{original:[1,2,3,4,5],sheet:[1,2,3,4,5],ivan:[1,2,3,5,6]}};let posts=0;
 await p.route('**/api/backups?*',r=>r.abort());await p.route('**/api/streaks',async r=>{const body=r.request().method()==='POST'?r.request().postDataJSON():null;if(body){posts++;for(const e of body.events)if(e.completed&&!snapshot.dates.some(d=>d.person===e.person&&d.date===e.date))snapshot.dates.push({person:e.person,date:e.date});}await r.fulfill({json:body?{ok:true,accepted:body.events.map(e=>e.id)}:snapshot});});
 await p.goto('http://127.0.0.1:4174/gym-tracker/');await p.getByRole('button',{name:'Abrir ajustes',exact:true}).click();const d=p.waitForEvent('download');await p.getByRole('button',{name:'Exportar backup',exact:true}).click();const backup=JSON.parse(fs.readFileSync(await(await d).path(),'utf8'));
 const stamp=Date.now();backup.data.history=[{id:'partial-recovery-test',person:'original',workoutId:'a',workoutName:'Treino A',startedAt:stamp-60000,finishedAt:stamp,exercises:[{exerciseId:'bench-press',name:'Supino reto com barra',image:0,kind:'reps',target:'12',weight:20,done:[true,false,false],muscle:'chest'}]}];
 fs.mkdirSync('artifacts/streak-recovery',{recursive:true});fs.writeFileSync('artifacts/streak-recovery/data.json',JSON.stringify(backup));await p.locator('input[type=file]').setInputFiles('artifacts/streak-recovery/data.json');await p.getByRole('button',{name:'Substituir e restaurar',exact:true}).click();
 await p.waitForFunction(()=>document.querySelector('.streak-header-badge')?.textContent==='1');for(let i=0;i<30&&!snapshot.dates.length;i++)await p.waitForTimeout(100);assert.equal(snapshot.dates[0].person,'original');
 // Empty server after a successful receipt: reopening must reconcile and resend.
 snapshot.dates=[];const before=posts;await p.reload();await p.waitForFunction(()=>document.querySelector('.streak-header-badge')?.textContent==='1');await p.waitForTimeout(1200);assert.ok(posts>before);assert.equal(snapshot.dates.length,1);
 console.log('PASS: finalized partial workout is uploaded; acknowledged date missing from server is re-sent on reload.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
