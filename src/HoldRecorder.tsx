import { useEffect, useState } from 'react';
import type { ExerciseLog } from './types';
export function HoldRecorder({ log, onStart, onSave }: { log: ExerciseLog; onStart: () => void; onSave: (index:number, seconds:number) => void }) {
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{if(!log.holdStartedAt)return;const timer=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(timer);},[log.holdStartedAt]);
  if(log.kind!=='seconds')return null;
  const next=log.done.findIndex(done=>!done);
  const elapsed=log.holdStartedAt ? Math.max(0,Math.floor((now-log.holdStartedAt)/1000)) : 0;
  return <div className="hold-recorder"><div><strong>Sustentação</strong><button className="secondary" disabled={next<0 && !log.holdStartedAt} onClick={()=>log.holdStartedAt ? onSave(next<0?log.done.length-1:next,Math.max(1,Math.min(86400,Math.floor((Date.now()-log.holdStartedAt)/1000)))) : onStart()}>{log.holdStartedAt ? `Parar e registrar · ${elapsed} s` : 'Iniciar sustentação'}</button></div><div className="hold-values">{log.done.map((_,i)=><label key={i}>S{i+1}<input key={`${i}-${log.seconds?.[i]}`} type="number" min="1" max="86400" inputMode="numeric" placeholder="—" defaultValue={log.seconds?.[i] ?? ''} aria-label={`Segundos da série ${i+1} de ${log.name}`} onBlur={e=>{if(e.target.value)onSave(i,Number(e.target.value));}}/>s</label>)}</div><small>Registre o tempo de cada série pelo cronômetro ou manualmente.</small></div>;
}
