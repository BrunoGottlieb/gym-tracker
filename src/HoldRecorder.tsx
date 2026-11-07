import { useEffect, useState } from 'react';
import { holdSideLabels, holdSides, usesHoldSides } from './domain';
import type { ExerciseLog, HoldSide } from './types';

export function HoldRecorder({ log, onStart, onSave }: {
  log: ExerciseLog;
  onStart: (side?: HoldSide) => void;
  onSave: (index: number, seconds: number, side?: HoldSide) => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [selectedSide, setSelectedSide] = useState<HoldSide>('left');
  const started = log.holdStartedAt;
  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [started]);
  if (log.kind !== 'seconds') return null;

  const twoSides = usesHoldSides(log);
  const side = twoSides ? (started ? log.holdSide : selectedSide) : undefined;
  const times = side ? log.secondsBySide?.[side] : log.seconds;
  const next = log.done.findIndex((done, index) => !done && times?.[index] == null);
  const elapsed = started ? Math.max(0, Math.floor((now - started) / 1000)) : 0;

  function pressTimer() {
    if (!started) { onStart(side); return; }
    const index = next < 0 ? log.done.length - 1 : next;
    onSave(index, Math.max(1, Math.min(86400, Math.floor((Date.now() - started) / 1000))), side);
    if (side) {
      const other = side === 'left' ? 'right' : 'left';
      if (log.secondsBySide?.[other][index] == null) setSelectedSide(other);
    }
  }

  return <div className="hold-recorder">
    <div><strong>Sustentação</strong><button className="secondary" disabled={next < 0 && !started} onClick={pressTimer}>{started ? `Parar e registrar · ${elapsed} s` : 'Iniciar sustentação'}</button></div>
    {twoSides && <div className="hold-side-switch" role="group" aria-label={`Lado da sustentação de ${log.name}`}>
      {holdSides.map(key => <button key={key} type="button" disabled={!!started} aria-pressed={side === key} onClick={() => setSelectedSide(key)}>
        {holdSideLabels[key]} <small>{log.secondsBySide?.[key].filter(value => value != null).length ?? 0}/{log.done.length}</small>
      </button>)}
    </div>}
    <div className="hold-values">{log.done.map((_, index) => <label key={index}>S{index + 1}
      <input key={`${side}-${index}-${times?.[index]}`} type="number" min="1" max="86400" inputMode="numeric" placeholder="—" defaultValue={times?.[index] ?? ''} disabled={!!started}
        aria-label={`Segundos da série ${index + 1} de ${log.name}${side ? ` · lado ${holdSideLabels[side].toLowerCase()}` : ''}`}
        onBlur={event => { if (event.target.value && Number(event.target.value) !== times?.[index]) onSave(index, Number(event.target.value), side); }} />s
    </label>)}</div>
    <small>{twoSides ? 'Registre os dois lados para concluir a série pelo cronômetro.' : 'Registre o tempo de cada série pelo cronômetro ou manualmente.'}</small>
  </div>;
}
