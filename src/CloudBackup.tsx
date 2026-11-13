import { avatarWallet, walletBalance } from './avatars';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { createBackup, hasRecordedHold, parseBackup } from './domain';
import { canonicalExerciseId } from './catalog';
import { database } from './storage';
import { STREAK_GROUP_KEY } from './streakConfig';
import { planLabels } from './routinePlans';
import type { AppState } from './types';
import { firstBrunoAssessment, secondBrunoAssessment } from './assessments';

export function profileBackup(state:AppState) {
  const person=state.selectedPlan??'original';
  const history=state.history.filter(s=>(s.person??'original')===person).map(s=>({...s,person:s.person??'original'}));
  const ids=new Set([...state.workouts.flatMap(w=>w.exercises.map(e=>canonicalExerciseId(e.id))),...history.flatMap(s=>s.exercises.map(e=>canonicalExerciseId(e.exerciseId)))]);
  return createBackup({...state,avatarWallets:{[person]:avatarWallet(state,person)},avatars:state.avatars?.[person]?{[person]:state.avatars[person]}:undefined,preferences:{...state.preferences,weeklyGoals:state.preferences.weeklyGoals?.[person]===undefined?undefined:{[person]:state.preferences.weeklyGoals[person]},rewardAuras:state.preferences.rewardAuras?.[person]===undefined?undefined:{[person]:state.preferences.rewardAuras[person]}},assessments:(state.assessments??[]).filter(a=>a.person===person),weights:Object.fromEntries(Object.entries(state.weights).filter(([id])=>ids.has(id))),exerciseNotes:Object.fromEntries(Object.entries(state.exerciseNotes??{}).filter(([id])=>ids.has(id))),planSnapshots:undefined,history,timer:{...state.timer,endAt:null,started:false,remaining:state.timer.duration}});
}
// Ignore export timestamps when determining whether anything actually changed.
const fingerprint=(payload:string)=>JSON.stringify(JSON.parse(payload).data);
export function restoreProfile(current:AppState,payload:string):AppState {
  const restored=parseBackup(payload),person=current.selectedPlan??'original';
  if((restored.selectedPlan??'original')!==person)throw Error('O backup pertence a outro perfil.');
  return {...current,...restored,avatarWallets:{...current.avatarWallets,[person]:avatarWallet(restored,person)},avatars:{...current.avatars,...(restored.avatars?.[person]?{[person]:restored.avatars[person]}:{})},preferences:{...restored.preferences,weeklyGoals:{...current.preferences.weeklyGoals,...(restored.preferences.weeklyGoals?.[person]===undefined?{}:{[person]:restored.preferences.weeklyGoals[person]})},rewardAuras:{...current.preferences.rewardAuras,...(restored.preferences.rewardAuras?.[person]===undefined?{}:{[person]:restored.preferences.rewardAuras[person]})}},assessments:[...(current.assessments??[]).filter(a=>a.person!==person),...(restored.assessments??[]).filter(a=>a.person===person)],weights:{...current.weights,...restored.weights},exerciseNotes:{...current.exerciseNotes,...restored.exerciseNotes},active:restored.active?{...restored.active,exercises:restored.active.exercises.map(e=>({...e,holdStartedAt:undefined,holdSide:undefined}))}:null,planSnapshots:{...current.planSnapshots,[person]:restored.workouts},history:[...current.history.filter(s=>(s.person??'original')!==person),...restored.history].sort((a,b)=>b.finishedAt!-a.finishedAt!)};
}
const hasWalletData=(state:AppState)=>{
  const wallet=avatarWallet(state);
  return walletBalance(wallet)>0 || Object.keys(wallet.purchases).length>0 || wallet.gifts.length>0;
};
/** Only an untouched empty cloud seed can be filled automatically by an existing phone. */
export function canReplaceEmptyCloudSeed(remotePayload:string,localPayload:string):boolean {
  const remote=parseBackup(remotePayload),local=parseBackup(localPayload);
  return (remote.selectedPlan??'original')===(local.selectedPlan??'original') && (remote.assessments??[]).filter(a=>a.person===(remote.selectedPlan??'original')).every(a=>[firstBrunoAssessment,secondBrunoAssessment].some(seed=>JSON.stringify(a)===JSON.stringify(seed))) && !hasWalletData(remote) && !remote.avatars?.[remote.selectedPlan??'original'] && remote.history.length===0 && Object.keys(remote.weights).length===0 && Object.values(remote.exerciseNotes??{}).every(note=>!note.trim()) && !remote.active?.exercises.some(e=>e.done.some(Boolean) || e.holdStartedAt || e.weight>0 || hasRecordedHold(e)) && ((local.assessments??[]).some(a=>a.person===(local.selectedPlan??'original') && ![firstBrunoAssessment,secondBrunoAssessment].some(seed=>JSON.stringify(a)===JSON.stringify(seed))) || hasWalletData(local) || !!local.avatars?.[local.selectedPlan??'original'] || local.history.length>0 || Object.keys(local.weights).length>0 || !!local.active?.exercises.some(e=>e.done.some(Boolean) || hasRecordedHold(e)));
}
const api='https://gym-tracker-streaks-brunogottlieb.darthgottlieb.chatgpt.site/api/backups';
async function request(person:string,body?:unknown) {
  const r=await fetch(`${api}?person=${person}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${STREAK_GROUP_KEY}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(r.status===409)throw Error('Outro aparelho salvou uma cópia mais recente. Consulte a nuvem antes de substituir.');
  if(!r.ok)throw Error('Backup pendente. Seus dados continuam neste aparelho.');
  return r.json();
}
export function CloudBackupPanel({state,onRestore,visible}:{state:AppState;onRestore:(s:AppState)=>void;visible:boolean}) {
  const [anchor,setAnchor]=useState<HTMLElement|null>(null);
  useEffect(()=>setAnchor(visible?document.getElementById('cloud-backup-anchor'):null),[visible]);
  const person=state.selectedPlan??'original',payload=profileBackup(state),signature=fingerprint(payload);
  const [status,setStatus]=useState('Consultando a nuvem…'),[tick,setTick]=useState(0),[ready,setReady]=useState(false);
  const [remote,setRemote]=useState<{revision:string;payload:string;updatedAt:string}|null>(null);
  const latest=useRef({state,payload,signature});latest.current={state,payload,signature};
  const known=useRef<{revision:string|null;signature:string}|null>(null);
  const generation=useRef(0),busy=useRef(false);
  useEffect(()=>{
    const refresh=()=>setTick(v=>v+1);window.addEventListener('online',refresh);const timer=setInterval(refresh,30000);
    return()=>{window.removeEventListener('online',refresh);clearInterval(timer);};
  },[]);
  useEffect(()=>{
    let alive=true;const run=++generation.current;setReady(false);known.current=null;
    (async()=>{
      try {
        const data=await request(person);if(!alive)return;
        if(data?.revision && typeof data.payload==='string'){parseBackup(data.payload);setRemote(data);}else if(data?.revision===null)setRemote(null);else throw Error('Resposta de backup inválida.');
        const local=(await database.sync.get(`backup-${person}`))?.value as {revision?:string;signature?:string}|undefined;
        if(!alive)return;
        if(data.revision && local?.revision!==data.revision && fingerprint(data.payload)!==latest.current.signature && !canReplaceEmptyCloudSeed(data.payload,latest.current.payload)){setStatus('Há um backup na nuvem. Escolha restaurar ou guardar os dados deste aparelho.');return;}
        known.current={revision:data.revision,signature:data.revision?fingerprint(data.payload):''};setReady(true);setStatus(data.updatedAt && fingerprint(data.payload)===latest.current.signature?`Último backup: ${new Date(data.updatedAt).toLocaleString('pt-BR')}`:'Alterações locais aguardando backup…');
      }catch(error){if(alive)setStatus(error instanceof Error?error.message:'Backup pendente.');}
    })();return()=>{alive=false;if(generation.current===run)generation.current++;};
  },[person,tick]);
  async function upload(force=false){
    if(busy.current)return;const base=force?remote?.revision??null:known.current?.revision;
    if(base===undefined)return;
    const run=generation.current,copy=latest.current;busy.current=true;setStatus('Salvando backup…');
    try{
      const result=await request(person,{expectedRevision:base,payload:copy.payload});
      if(run!==generation.current)return;
      known.current={revision:result.revision,signature:copy.signature};
      await database.sync.put({id:`backup-${person}`,value:known.current});
      setRemote({...result,payload:copy.payload});setReady(true);setStatus(`Último backup: ${new Date(result.updatedAt).toLocaleString('pt-BR')}`);
    }catch(error){if(run===generation.current){setReady(false);setStatus(error instanceof Error?error.message:'Backup pendente.');}}
    finally{busy.current=false;}
  }
  useEffect(()=>{if(!ready || signature===known.current?.signature)return;const timer=setTimeout(()=>void upload(),2000);return()=>clearTimeout(timer);},[signature,ready,status]);
  if(!visible || !anchor)return null;
  return createPortal(<section className="settings-section cloud-backup"><h2>Backup automático · {planLabels[person]}</h2><p className="subtle" role="status">{status}</p><p className="subtle">Avatar, moedas, compras, avaliações, cargas, ficha, treino em andamento e histórico. Salva após alterações quando há internet; restaurar exige sua confirmação.</p><div className="backup-actions"><button className="secondary" onClick={()=>setTick(v=>v+1)}>Consultar nuvem</button>{remote && <button className="secondary" onClick={async()=>{if(!confirm(`Restaurar o backup de ${planLabels[person]}? Os dados locais desse perfil serão substituídos.`))return;try{await database.sync.put({id:`backup-${person}`,value:{revision:remote.revision,signature:fingerprint(remote.payload)}});onRestore(restoreProfile(latest.current.state,remote.payload));setTick(v=>v+1);}catch(e){setStatus(e instanceof Error?e.message:'Falha ao restaurar.');}}}>Restaurar da nuvem</button>}{!ready && remote && <button className="secondary" onClick={()=>{if(confirm('Substituir o backup na nuvem pelos dados deste aparelho? A cópia anterior ficará guardada no serviço.'))void upload(true);}}>Guardar este aparelho na nuvem</button>}</div></section>,anchor);
}
