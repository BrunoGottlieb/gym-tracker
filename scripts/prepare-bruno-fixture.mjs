import { createServer } from '../node_modules/vite/dist/node/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true}});
try {
 const {createLegacyState}=await server.ssrLoadModule('/src/data.ts');
 const {createSession}=await server.ssrLoadModule('/src/domain.ts');
 const state=createLegacyState();state.weights={'lat-pulldown':45,'preacher-curl':25,'bench-press':60};state.exerciseNotes={'bench-press':'Banco 3'};
 state.active=createSession(state.workouts[1],state.weights,Date.now()-60000);state.active.exercises[0].done[0]=true;
 state.history=[{...structuredClone(state.active),id:'legacy-record',finishedAt:Date.now()-1000}];
 mkdirSync('artifacts/bruno-plan',{recursive:true});writeFileSync('artifacts/bruno-plan/legacy.json',JSON.stringify({format:'gym-tracker',version:1,data:state}));
}finally{await server.close();}
