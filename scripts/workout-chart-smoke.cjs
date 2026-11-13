const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 try{
 const p=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});await p.route('**/api/{streaks,backups,avatars}**',r=>r.abort());
 await p.goto('http://127.0.0.1:4174/gym-tracker/');await p.getByRole('button',{name:'Abrir ajustes',exact:true}).click();
 const download=p.waitForEvent('download');await p.getByRole('button',{name:'Exportar backup',exact:true}).click();const file=await(await download).path();const backup=JSON.parse(fs.readFileSync(file,'utf8'));
 const log={exerciseId:'bench-press',name:'Supino reto com barra',image:0,target:'12',kind:'reps',muscle:'chest',weight:20,done:[true,true]};
 const session=(id,workoutId,date,exercise)=>({id,workoutId,workoutName:workoutId.toUpperCase(),person:'original',startedAt:date-60000,finishedAt:date,exercises:[exercise]});
 backup.data.history=[session('one','a',new Date(2026,9,19,18).getTime(),log),session('two','a',new Date(2026,9,21,18).getTime(),{...log,done:[true,true,true,true]}),session('three','b',new Date(2026,9,19,19).getTime(),{...log,exerciseId:'cable-row',muscle:'back',done:[true]})];
 fs.mkdirSync('artifacts/workout-chart',{recursive:true});fs.writeFileSync('artifacts/workout-chart/fixture.json',JSON.stringify(backup));
 await p.locator('input[type=file]').setInputFiles('artifacts/workout-chart/fixture.json');await p.getByRole('button',{name:'Substituir e restaurar',exact:true}).click();await p.getByRole('button',{name:'Histórico',exact:true}).click();
 const chart=p.locator('.weekly-completed-chart');assert.deepEqual(await chart.locator('.weekday-bar-label').allTextContents(),['A','B','C','D','E','CASA']);
 assert.equal(await chart.locator('[data-workout=a] .weekday-bar-value').textContent(),'3');assert.equal(await chart.locator('[data-workout=b] .weekday-bar-value').textContent(),'1');
 await chart.locator('[data-workout=a]').click();assert.match(await chart.locator('.weekday-chart-detail').textContent(),/2 treinos registrados/);
 for(const width of[320,390,1280]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await p.setViewportSize({width:390,height:844});await chart.screenshot({path:'artifacts/workout-chart/chart.png'});
 console.log('PASS: A across different weekdays, B on the same day, empty workout bars, muscle stacks, details and mobile/desktop layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
