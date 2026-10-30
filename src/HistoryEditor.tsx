import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ExerciseLog, Session } from './types';
import { canonicalExerciseId, getMuscle, snapshotExercise } from './catalog';
import { ExercisePicker } from './ExercisePicker';
import { toggleSeriesCompletion, MAX_SESSION_SETS } from './domain';
import { MuscleBadge } from './components';

function localInput(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function HistoryEditor({ session, onSave, onClose }: { session: Session; onSave: (session: Session) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(() => structuredClone(session));
  const [start, setStart] = useState(() => localInput(session.startedAt));
  const [end, setEnd] = useState(() => localInput(session.finishedAt!));
  const [error, setError] = useState('');
  const [picker, setPicker] = useState<number | 'add' | null>(null);
  const update = (index: number, patch: Partial<ExerciseLog>) => setDraft(value => ({ ...value, exercises: value.exercises.map((log, i) => i === index ? { ...log, ...patch } : log) }));
  return <form className="history-editor" onSubmit={event => {
    event.preventDefault();
    // Retain original seconds when the user did not edit the minute-level inputs.
    const startedAt = start === localInput(session.startedAt) ? session.startedAt : new Date(start).getTime();
    const finishedAt = end === localInput(session.finishedAt!) ? session.finishedAt! : new Date(end).getTime();
    if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt) || finishedAt < startedAt) { setError('O término precisa ser igual ou posterior ao início.'); return; }
    if (!draft.exercises.some(log => log.done.some(Boolean))) { setError('Marque pelo menos uma série realizada.'); return; }
    try { onSave({ ...draft, workoutName: draft.workoutName.trim(), startedAt, finishedAt, exercises: draft.exercises.map(log => ({ ...log, name: log.name.trim(), target: log.target.trim() })) }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar este registro.'); }
  }}>
    <p className="subtle">Corrija o que foi realizado nesta sessão. Os gráficos e o calendário refletem os dados salvos.</p>
    <label className="form-field">Nome do treino registrado<input required maxLength={100} value={draft.workoutName} onChange={e => setDraft({ ...draft, workoutName: e.target.value })} /></label>
    <div className="form-grid history-dates"><label className="form-field">Início<input required type="datetime-local" value={start} onChange={e => setStart(e.target.value)} /></label><label className="form-field">Término<input required type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} /></label></div>
    {picker !== null && <ExercisePicker key={picker} exercises={draft.exercises.map(snapshotExercise)} replacing={picker === 'add' ? null : picker} onClose={() => setPicker(null)} onSelect={preset => {
      if (draft.exercises.some((log, index) => index !== picker && canonicalExerciseId(log.exerciseId) === preset.id)) return;
      const log: ExerciseLog = { exerciseId: preset.id, name: preset.name, image: preset.image, muscle: preset.muscle, target: preset.target, kind: preset.kind, weight: 0, done: Array(preset.sets).fill(false) };
      setDraft(value => ({ ...value, exercises: picker === 'add' ? [...value.exercises, log] : value.exercises.map((current, index) => index === picker ? log : current) }));
      setPicker(null);
    }} />}
    {draft.exercises.map((log, index) => <fieldset className="editor-exercise history-editor-exercise" key={log.exerciseId}>
      <legend>Exercício {index + 1}</legend>
      <div className="editor-main"><img src={`${import.meta.env.BASE_URL}images/exercise-${log.image}.webp`} alt={`Ilustração de ${log.name}`} /><label className="form-field">Nome do exercício<input required maxLength={140} value={log.name} onChange={e => update(index, { name: e.target.value })} /></label></div>
      <MuscleBadge muscle={getMuscle(log)} />
      <button type="button" className="text-button choose-preset" onClick={() => setPicker(index)}>Substituir exercício registrado</button>
      <div className="form-grid"><label className="form-field">Carga registrada (kg)<input required type="number" inputMode="decimal" min={0} max={5000} step="any" value={log.weight} onChange={e => update(index, { weight: Number(e.target.value) })} /></label><label className="form-field">Meta registrada<input required maxLength={30} value={log.target} onChange={e => update(index, { target: e.target.value })} /></label></div>
      <div className="history-series"><span className="field-caption">Séries realizadas · {log.done.filter(Boolean).length}/{log.done.length}</span><div className="set-buttons">{log.done.map((done, i) => <button type="button" key={i} className={`set-button ${done ? 'is-done' : ''}`} aria-pressed={done} aria-label={`${done ? 'Desmarcar' : 'Concluir'} série registrada ${i + 1} de ${log.name}`} onClick={() => update(index, { done: toggleSeriesCompletion(log.done, i) })}>{i + 1}{done && ' ✓'}</button>)}</div></div>
      <div className="editor-actions"><button type="button" className="secondary" disabled={log.done.length <= 1} onClick={() => update(index, { done: log.done.slice(0, -1) })} aria-label={`Remover última série registrada de ${log.name}`}>−1 série</button><button type="button" className="secondary" disabled={log.done.length >= MAX_SESSION_SETS} onClick={() => update(index, { done: [...log.done, false] })} aria-label={`Adicionar série registrada de ${log.name}`}>+1 série</button><button type="button" className="text-button danger" disabled={draft.exercises.length <= 1} onClick={() => { setPicker(null); setDraft({ ...draft, exercises: draft.exercises.filter((_, i) => i !== index) }); }}><Trash2 size={15} />Remover exercício</button></div>
    </fieldset>)}
    <button type="button" className="secondary full-width" disabled={draft.exercises.length >= 100} onClick={() => setPicker('add')}><Plus size={17} />Adicionar exercício ao registro</button>
    <p className="subtle">A edição vale para este registro. Sua ficha de treino e as cargas atuais lembradas pelo app são mantidas.</p>
    {error && <p className="error-text" role="alert">{error}</p>}
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar edição</button><button type="submit" className="primary">Salvar registro</button></div>
  </form>;
}
