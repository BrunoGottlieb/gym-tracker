const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const code=fs.readFileSync('streak-cloud/.dev.vars','utf8').match(/STREAK_ROOM_CODE\s*=\s*"?([^"\r\n]+)/)[1];
 const url='http://127.0.0.1:5180/api/streaks',headers={Authorization:`Bearer ${code}`,'Content-Type':'application/json',Origin:'https://brunogottlieb.github.io'};
 const post=body=>fetch(url,{method:'POST',headers,body:JSON.stringify(body)});
 assert.equal((await fetch(url)).status,401);assert.equal((await fetch(url,{headers:{Authorization:'Bearer wrong'}})).status,401);
 const pre=await fetch(url,{method:'OPTIONS',headers:{Origin:'https://brunogottlieb.github.io'}});assert.equal(pre.status,204);assert.equal(pre.headers.get('access-control-allow-origin'),'https://brunogottlieb.github.io');
 assert.equal((await fetch(url,{method:'OPTIONS',headers:{Origin:'https://other.example'}})).headers.get('access-control-allow-origin'),null);
 const get=async()=>{const r=await fetch(url,{headers});assert.equal(r.status,200);return r.json()};
 let e={id:'contract-test-01',person:'ivan',date:'2026-10-28',completed:true};
 assert.equal((await post({events:[e],profile:{person:'ivan',trainingDays:[1,2,3,5,6]}})).status,200);
 assert.equal((await post({events:[e]})).status,200);
 let data=await get();assert.equal(data.dates.filter(d=>d.person==='ivan'&&d.date===e.date).length,1);assert.deepEqual(data.trainingDays.ivan,[1,2,3,5,6]);
 e.date='2026-10-30';assert.equal((await post({events:[e]})).status,200);data=await get();assert.equal(data.dates.some(d=>d.date==='2026-10-28'),false);
 for(const event of [{...e,date:'2026-02-30'},{...e,date:'2099-01-01'},{...e,person:'invalid'}])assert.equal((await post({events:[event]})).status,400);
 assert.equal((await post({events:[e,e]})).status,400);assert.equal((await post({events:[],profile:{person:'ivan',trainingDays:[7]}})).status,400);
 assert.equal((await post({events:[{...e,completed:false}]})).status,200);assert.equal((await get()).dates.length,0);
 console.log('PASS API: auth, CORS, D1 persistence, replay, date edits, revocation and validation.');
})().catch(e=>{console.error(e);process.exitCode=1});
