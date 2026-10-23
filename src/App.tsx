import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarDays, Check, ChevronRight, CircleCheck, CloudOff, Download, Dumbbell, History, Leaf, LayoutGrid, LoaderCircle, MoreHorizontal, Pause, Pencil, Play, Plus, RotateCcw, Settings, ShieldCheck, Timer, Trash2, TrendingUp, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { addSessionSet, MAX_SESSION_SETS, beginWorkout, createSession, finishSession, formatTime, getProgress, createBackup, parseBackup, timerSeconds } from './domain';
import { loadState, saveState } from './storage';
import type { AppState, Exercise, ExerciseLog, MuscleGroup, Session, Workout } from './types';
import { canonicalExerciseId, getMuscle, imageNames, LAST_IMAGE_INDEX, muscleLabels, snapshotExercise } from './catalog';
import { MuscleBadge } from './components';
import { Progression } from './ProgressionView';
import { loadPoints } from './progression';
import { DayMarkers, TrainingCalendar } from './TrainingCalendar';
import { localDateKey, sessionsOnDate } from './calendar';

const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const imageUrl = (image: number) => `${import.meta.env.BASE_URL}images/exercise-${image}.webp`;
type View = 'home' | 'workout' | 'history' | 'settings' | 'progress';
type DialogState = { type: 'switch'; workout: Workout; firstSet?: { exerciseId: string; index: number }; extraSet?: string } | { type: 'finish' } | { type: 'discard' } | { type: 'timer' } | { type: 'edit'; workout: Workout } | { type: 'import'; data: AppState } | { type: 'detail'; session: Session } | { type: 'day'; date: string } | null;

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => { if (dialog.open) dialog.close(); }; }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }} aria-label={title}>
    <div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={21} /></button></div>{children}
  </dialog>;
}

function ImagePreview({ image, title, note, onNote, onClose }: { image: number; title: string; note?: string; onNote?: (note: string) => void; onClose: () => void }) {
  const [zoom, setZoom] = useState(false);
  return <Modal title={title} onClose={onClose} wide><div className={`image-preview-viewport ${zoom ? 'zoomed' : ''}`}><img src={imageUrl(image)} alt={`Ilustração ampliada de ${title}`} /></div><button className="secondary full-width zoom-control" onClick={() => setZoom(v => !v)}>{zoom ? <ZoomOut size={17} /> : <ZoomIn size={17} />}{zoom ? 'Ajustar à tela' : 'Ampliar mais'}</button>{zoom && <p className="subtle">Role a imagem para ver os detalhes.</p>}{onNote && <label className="form-field exercise-note">Minha regulagem / observação<textarea maxLength={1000} value={note ?? ''} onChange={e => onNote(e.target.value)} placeholder="Ex.: banco na posição 3, pegada neutra…" rows={3} /><span className="subtle">Salva automaticamente para os próximos treinos.</span></label>}</Modal>;
}

function ExerciseRow({ exercise, log, previous, onWeight, onToggle, onAddSet, onRest, onPreview, onProgress }: { exercise: Exercise; log: ExerciseLog; previous?: ExerciseLog; onWeight: (weight: number) => void; onToggle: (index: number) => void; onAddSet: () => void; onRest: () => void; onPreview: () => void; onProgress: () => void }) {
  const [draft, setDraft] = useState(String(log.weight));
  const seriesRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef(log.done.length);
  useEffect(() => { if (log.done.length > previousCount.current) seriesRef.current?.scrollTo({ left: seriesRef.current.scrollWidth, behavior: 'smooth' }); previousCount.current = log.done.length; }, [log.done.length]);
  useEffect(() => { setDraft(String(log.weight)); }, [log.weight]);
  const complete = log.done.every(Boolean);
  function changeWeight(value: string) {
    setDraft(value);
    const parsed = Number(value.replace(',', '.'));
    if (value.trim() && Number.isFinite(parsed) && parsed >= 0 && parsed <= 5000) onWeight(parsed);
  }
  return <article className={`exercise-row ${complete ? 'exercise-complete' : ''}`}>
    <button className="exercise-image-button" onClick={onPreview} aria-label={`Ampliar imagem de ${log.name}`}><img className="exercise-image" src={imageUrl(log.image)} alt={`Ilustração de ${log.name}`} /><span><ZoomIn size={13} /></span></button>
    <div className="exercise-content">
      <div className="exercise-title-row"><h2>{log.name}</h2>{complete && <CircleCheck size={17} className="completion-mark" aria-label="Exercício concluído" />}</div>
      <p className="exercise-target">{log.target} {log.kind === 'seconds' ? 'segundos de sustentação' : 'repetições'}</p>
      <MuscleBadge muscle={getMuscle(exercise)} />
      <div className="exercise-controls">
        <label className="weight-label">{['parallel-bar-dips', 'front-lever', 'l-sit', 'pullup'].includes(log.exerciseId) ? 'Carga extra' : 'Carga'}<span className="weight-input"><input inputMode="decimal" type="text" value={draft} onChange={e => changeWeight(e.target.value)} onBlur={() => setDraft(String(log.weight))} aria-label={`Carga de ${log.name}`} /><span>kg</span></span></label>
        <div className="set-control"><span className="field-caption">Séries</span><div className="series-line"><div className="set-buttons" ref={seriesRef} tabIndex={0} aria-label={`Séries de ${log.name}`}>{log.done.map((done, i) => <button key={i} className={`set-button ${done ? 'is-done' : ''}`} aria-label={`${done ? 'Desmarcar' : 'Concluir'} série ${i + 1} de ${log.name}`} aria-pressed={done} onClick={() => onToggle(i)}><span>{i + 1}</span>{done && <Check size={13} strokeWidth={2.5} />}</button>)}</div><button className="add-set-button" onClick={onAddSet} disabled={log.done.length >= MAX_SESSION_SETS} aria-label={`Adicionar série de ${log.name}`} title="Adicionar uma série neste treino">+1</button></div></div>
      </div>
      <div className="exercise-foot"><span>{previous ? `Última carga: ${previous.weight.toLocaleString('pt-BR')} kg` : 'Primeiro registro'}</span><button onClick={onRest} aria-label={`Descansar após ${log.name}`}><Timer size={13} /> {exercise.rest} s</button><button className="exercise-progress-link" onClick={onProgress} aria-label={`Ver evolução de ${log.name}`}><TrendingUp size={13} />Ver evolução</button></div>
    </div>
  </article>;
}

function WorkoutEditor({ workout, onSave, onClose }: { workout: Workout; onSave: (workout: Workout) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Workout>(() => structuredClone(workout));
  const [error, setError] = useState('');
  function updateExercise(index: number, patch: Partial<Exercise>) { setDraft(v => ({ ...v, exercises: v.exercises.map((e, i) => i === index ? { ...e, ...patch } : e) })); }
  function move(index: number, direction: number) { setDraft(v => { const exercises = [...v.exercises]; [exercises[index], exercises[index + direction]] = [exercises[index + direction], exercises[index]]; return { ...v, exercises }; }); }
  return <Modal title="Editar treino" onClose={onClose} wide><form onSubmit={e => { e.preventDefault(); if (!draft.name.trim() || draft.exercises.some(ex => !ex.name.trim() || !ex.target.trim())) { setError('Preencha o nome do treino, os exercícios e as metas.'); return; } onSave({ ...draft, name: draft.name.trim(), exercises: draft.exercises.map(ex => ({ ...ex, sets: 3, name: ex.name.trim(), target: ex.target.trim() })) }); }}>
    <div className="form-grid"><label className="form-field">Nome do treino<input maxLength={100} required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label className="form-field">Dia da semana<select value={draft.day} onChange={e => setDraft({ ...draft, day: +e.target.value })}>{days.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label></div>
    <p className="subtle editor-note">A ordem abaixo será a ordem do seu treino.</p>
    {draft.exercises.map((ex, index) => <fieldset className="editor-exercise" key={ex.id}>
      <legend>Exercício {index + 1}</legend>
      <div className="editor-main"><img src={imageUrl(ex.image)} alt="" /><label className="form-field">Nome<input required maxLength={140} value={ex.name} onChange={e => updateExercise(index, { name: e.target.value })} /></label></div>
      <div className="form-grid three-columns"><label className="form-field">Séries<input type="number" readOnly value={3} title="Três séries iniciais. Use +1 durante o treino para adicionar séries extras." /></label><label className="form-field">Meta<input required maxLength={30} value={ex.target} onChange={e => updateExercise(index, { target: e.target.value })} /></label><label className="form-field">Tipo<select value={ex.kind} onChange={e => updateExercise(index, { kind: e.target.value as Exercise['kind'] })}><option value="reps">Repetições</option><option value="seconds">Segundos</option></select></label></div>
      <div className="form-grid"><label className="form-field">Descanso (segundos)<input type="number" required min={15} max={600} step={1} value={ex.rest} onChange={e => updateExercise(index, { rest: Math.max(15, Math.min(600, +e.target.value || 15)) })} /></label><label className="form-field">Grupo muscular principal<select value={getMuscle(ex)} onChange={e => updateExercise(index, { muscle: e.target.value as MuscleGroup })}>{Object.entries(muscleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><label className="form-field editor-image-picker">Ilustração<select value={ex.image} onChange={e => updateExercise(index, { image: +e.target.value })}>{Array.from({ length: LAST_IMAGE_INDEX + 1 }, (_, i) => <option value={i} key={i}>{imageNames[i]}</option>)}</select></label>
      <div className="editor-actions"><button type="button" className="icon-button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Mover ${ex.name} para cima`}><ArrowUp size={17} /></button><button type="button" className="icon-button" onClick={() => move(index, 1)} disabled={index === draft.exercises.length - 1} aria-label={`Mover ${ex.name} para baixo`}><ArrowDown size={17} /></button><button type="button" className="text-button danger" disabled={draft.exercises.length === 1} onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter((_, i) => i !== index) })}><Trash2 size={15} />Remover</button></div>
    </fieldset>)}
    <button type="button" className="secondary full-width" disabled={draft.exercises.length >= 100} onClick={() => setDraft({ ...draft, exercises: [...draft.exercises, { id: crypto.randomUUID(), name: '', sets: 3, target: '8–12', kind: 'reps', rest: 90, image: 5, muscle: 'other' }] })}><Plus size={17} />Adicionar exercício</button>
    {error && <p className="error-text" role="alert">{error}</p>}
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button type="submit" className="primary">Salvar alterações</button></div>
  </form></Modal>;
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const stateRef = useRef<AppState | null>(null);
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const [view, setView] = useState<View>('home');
  const [viewedWorkoutId, setViewedWorkoutId] = useState<string | null>(null);
  const [progressExercise, setProgressExercise] = useState('bench-press');
  const [preview, setPreview] = useState<{ image: number; title: string; exerciseId?: string } | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(Date.now());
  const [installPrompt, setInstallPrompt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const timerEnd = useRef<number | null>(null);
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  useEffect(() => { let mounted = true; loadState().then(value => { if (!mounted) return; stateRef.current = value; setState(value); }).catch(() => { if (mounted) setLoadError('Não foi possível abrir os dados do aparelho. Verifique se o armazenamento do navegador está disponível. Seus dados não foram apagados.'); }); return () => { mounted = false; }; }, []);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); const visibility = () => setNow(Date.now()); document.addEventListener('visibilitychange', visibility); return () => { clearInterval(id); document.removeEventListener('visibilitychange', visibility); }; }, []);
  useEffect(() => { const status = () => setOnline(navigator.onLine); const install = (e: Event) => { e.preventDefault(); setInstallPrompt(e as Event & { prompt: () => Promise<void> }); }; window.addEventListener('online', status); window.addEventListener('offline', status); window.addEventListener('beforeinstallprompt', install); return () => { window.removeEventListener('online', status); window.removeEventListener('offline', status); window.removeEventListener('beforeinstallprompt', install); }; }, []);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(id); }, [notice]);

  const commit = useCallback((transform: (current: AppState) => AppState) => {
    if (!stateRef.current) return;
    const next = transform(stateRef.current);
    stateRef.current = next;
    setState(next);
    setSaving(true);
    const currentRevision = ++revision.current;
    queue.current = queue.current.catch(() => {}).then(() => saveState(next)).then(() => { if (currentRevision === revision.current) { setSaving(false); setError(''); } }).catch(() => { setSaving(false); setError('Não foi possível salvar. Mantenha o app aberto e exporte um backup para proteger seus registros.'); });
  }, []);

  const remaining = state ? timerSeconds(state.timer, now) : 90;
  useEffect(() => {
    if (!state?.timer.endAt || remaining > 0 || timerEnd.current === state.timer.endAt) return;
    timerEnd.current = state.timer.endAt;
    try { navigator.vibrate?.(180); } catch { /* Vibration is optional and may be unsupported or blocked. */ }
    if (state.preferences.sound) {
      try { const audio = new AudioContext(); const oscillator = audio.createOscillator(); const gain = audio.createGain(); oscillator.connect(gain); gain.connect(audio.destination); gain.gain.setValueAtTime(0.12, audio.currentTime); oscillator.frequency.value = 660; oscillator.start(); oscillator.stop(audio.currentTime + 0.35); oscillator.onended = () => { void audio.close(); }; } catch { /* Audio is optional and may be blocked by the browser. */ }
    }
    setNotice('Descanso concluído. Bora para a próxima série!');
    commit(s => ({ ...s, timer: { ...s.timer, remaining: 0, endAt: null } }));
  }, [remaining, state?.timer.endAt, state?.preferences.sound, commit]);

  function navigate(next: View) { setView(next); setDialog(null); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function openProgress(exerciseId: string) { setProgressExercise(canonicalExerciseId(exerciseId)); navigate('progress'); }
  function openWorkout(workout: Workout) {
    setViewedWorkoutId(workout.id);
    navigate('workout');
  }
  function returnToActive() {
    const workout = stateRef.current?.workouts.find(w => w.id === stateRef.current?.active?.workoutId);
    if (workout) openWorkout(workout);
  }
  function startWorkout(workout: Workout, firstSet?: { exerciseId: string; index: number }, extraSet?: string) {
    if (stateRef.current?.active && stateRef.current.active.workoutId !== workout.id) { setDialog({ type: 'switch', workout, firstSet, extraSet }); return; }
    commit(s => { const next = beginWorkout(s, workout, firstSet); return extraSet ? addSessionSet(next, extraSet) : next; });
    setViewedWorkoutId(workout.id);
    navigate('workout');
  }
  function startRest(duration: number, exercise = '') {
    timerEnd.current = null;
    commit(s => ({ ...s, timer: { duration, remaining: duration, endAt: Date.now() + duration * 1000, started: true, exercise } }));
    setNow(Date.now());
  }
  function pauseOrResume() {
    if (!state) return;
    if (!state.timer.started || !remaining) { startRest(state.timer.duration, state.timer.exercise); return; }
    commit(s => ({ ...s, timer: { ...s.timer, remaining: timerSeconds(s.timer), endAt: s.timer.endAt ? null : Date.now() + timerSeconds(s.timer) * 1000 } }));
    setNow(Date.now());
  }
  function stopRest() { commit(s => ({ ...s, timer: { ...s.timer, started: false, endAt: null, remaining: s.timer.duration } })); }
  function changeWeight(exerciseId: string, weight: number) { const id = canonicalExerciseId(exerciseId); commit(s => ({ ...s, weights: { ...s.weights, [id]: weight }, active: s.active?.workoutId === viewedWorkoutId ? { ...s.active, exercises: s.active.exercises.map(e => canonicalExerciseId(e.exerciseId) === id ? { ...e, weight } : e) } : s.active })); }
  function toggleSet(exercise: Exercise, index: number) {
    const workout = stateRef.current?.workouts.find(w => w.id === viewedWorkoutId);
    if (!workout) return;
    if (stateRef.current?.active?.workoutId !== workout.id) { startWorkout(workout, { exerciseId: exercise.id, index }); return; }
    commit(s => {
      if (!s.active) return s;
      const wasDone = s.active.exercises.find(e => e.exerciseId === exercise.id)!.done[index];
      const active = { ...s.active, exercises: s.active.exercises.map(e => e.exerciseId === exercise.id ? { ...e, done: e.done.map((d, i) => i === index ? !d : d) } : e) };
      return { ...s, active, timer: !wasDone && s.preferences.autoRest ? { duration: exercise.rest, remaining: exercise.rest, endAt: Date.now() + exercise.rest * 1000, exercise: exercise.name, started: true } : s.timer };
    });
  }
  function addSet(exerciseId: string) {
    const workout = stateRef.current?.workouts.find(w => w.id === viewedWorkoutId);
    if (!workout) return;
    if (stateRef.current?.active?.workoutId !== workout.id) { startWorkout(workout, undefined, exerciseId); return; }
    commit(s => addSessionSet(s, exerciseId));
  }
  function exportBackup() {
    if (!state) return;
    const url = URL.createObjectURL(new Blob([createBackup(state)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `gym-tracker-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Backup exportado. Guarde o arquivo em um lugar seguro.');
  }
  async function importBackup(file: File) {
    try { if (file.size > 20 * 1024 * 1024) throw new Error('O arquivo é muito grande. Escolha um backup de até 20 MB.'); setDialog({ type: 'import', data: parseBackup(await file.text()) }); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível importar este arquivo.'); }
  }

  if (!state) return <main className="loading-screen"><Dumbbell size={38} /><h1>gym tracker.</h1>{loadError ? <><p role="alert">{loadError}</p><button className="primary" onClick={() => location.reload()}>Tentar novamente</button><label className="secondary">Restaurar backup<input type="file" accept=".json,application/json" hidden onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { const value = parseBackup(await file.text()); if (!confirm('Restaurar este backup e substituir os dados locais?')) return; await saveState(value); location.reload(); } catch (error) { setLoadError(error instanceof Error ? error.message : 'Falha ao restaurar backup.'); } }} /></label></> : <><LoaderCircle className="spin" size={22} /><p>Abrindo seus treinos…</p></>}</main>;

  const active = state.active;
  const selectedWorkout = state.workouts.find(w => w.id === viewedWorkoutId);
  const viewingActive = !!active && selectedWorkout?.id === active.workoutId;
  const displayedSession = viewingActive ? active : selectedWorkout ? createSession(selectedWorkout, state.weights) : null;
  const displayedProgress = displayedSession ? getProgress(displayedSession) : { done: 0, total: 0 };
  const progress = active ? getProgress(active) : { done: 0, total: 0 };
  const date = new Date(now);
  const day = date.getDay();
  const workoutToday = state.workouts.find(w => w.day === day);
  const completedWorkoutIds = new Set(state.history.filter(s => { const p = getProgress(s); return p.done === p.total && new Date(s.finishedAt!).toDateString() === date.toDateString(); }).map(s => s.workoutId));
  const isRunning = state.timer.endAt !== null && remaining > 0;
  const isFinished = state.timer.started && remaining === 0;

  const restPanel = (full = false) => <section className={`rest-panel ${full ? 'rest-panel-full' : ''} ${isFinished ? 'rest-finished' : ''}`} aria-label="Temporizador de descanso">
    <div className="rest-main"><div className="rest-label"><Timer size={full ? 25 : 22} /><div><span>{isFinished ? 'Próxima série!' : 'Descanso'}{state.timer.started && !isRunning && !isFinished ? ' · pausado' : ''}</span>{full && state.timer.exercise && <p>{state.timer.exercise}</p>}</div></div><strong className="rest-clock" role="timer" aria-label={`${remaining} segundos restantes`}>{formatTime(remaining)}</strong><button className={isRunning ? 'timer-pause' : 'primary compact'} onClick={pauseOrResume} aria-label={isRunning ? 'Pausar descanso' : 'Iniciar descanso'}>{isRunning ? <Pause size={18} /> : <Play size={15} fill="currentColor" />}<span>{isRunning ? 'Pausar' : state.timer.started && remaining ? 'Retomar' : 'Iniciar'}</span></button></div>
    {(state.timer.started || full) && <div className="rest-options"><div className="rest-presets">{[60, 90, 120, 180].map(duration => <button key={duration} className={state.timer.duration === duration ? 'selected' : ''} onClick={() => { commit(s => ({ ...s, preferences: { ...s.preferences, restDuration: duration }, timer: { ...s.timer, duration, remaining: duration, endAt: isRunning ? Date.now() + duration * 1000 : null, started: isRunning } })); }}>{duration} s</button>)}</div><div className="rest-extra"><button onClick={() => commit(s => { const seconds = Math.min(3600, timerSeconds(s.timer) + 30); return { ...s, timer: { ...s.timer, remaining: seconds, endAt: s.timer.endAt ? Date.now() + seconds * 1000 : null } }; })}>+ 30 s</button><button onClick={() => startRest(state.timer.duration, state.timer.exercise)} aria-label="Reiniciar descanso"><RotateCcw size={14} /></button><button onClick={stopRest}>Encerrar</button></div></div>}
    {!full && <button className="rest-expand" onClick={() => setDialog({ type: 'timer' })} aria-label="Configurar descanso"><MoreHorizontal size={18} /></button>}
  </section>;

  return <div className="app-shell">
    <header className="app-header"><button className="brand" onClick={() => navigate('home')} aria-label="Gym Tracker, início"><Dumbbell size={29} strokeWidth={2.5} /><span>gym tracker<span className="brand-dot">.</span></span></button><div className="header-actions"><span className={`save-status ${error ? 'save-error' : ''}`} title={error || 'Dados armazenados neste aparelho'}>{saving ? <LoaderCircle size={14} className="spin" /> : online ? <ShieldCheck size={14} /> : <CloudOff size={14} />}<span>{error ? 'Falha ao salvar' : saving ? 'Salvando…' : online ? 'Salvo no aparelho' : 'Modo offline'}</span></span><button className={`icon-button ${view === 'settings' ? 'selected' : ''}`} onClick={() => navigate('settings')} aria-label="Abrir ajustes"><Settings size={21} /></button></div></header>
    {error && <div className="alert error" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Fechar aviso"><X size={17} /></button></div>}
    {needRefresh && <div className="alert"><span>Uma atualização está pronta. Seu treino está salvo.</span><button onClick={async () => { try { await queue.current; if (stateRef.current) await saveState(stateRef.current); await updateServiceWorker(true); } catch { setError('Salve seus dados ou exporte um backup antes de atualizar.'); } }}>Atualizar app</button></div>}
    <main className={`main-content ${view === 'workout' ? 'workout-content' : ''}`}>
      {active && !(view === 'workout' && viewingActive) && <button className="resume-banner ongoing-workout-banner" onClick={returnToActive} aria-label={`Retornar ao treino em andamento: ${active.workoutName}`}><span className="resume-icon"><Play size={18} fill="currentColor" /></span><span><strong>Treino em andamento</strong><span>{active.workoutName} · {progress.done}/{progress.total} séries</span><span className="resume-action">Retornar ao treino</span></span><ArrowRight size={20} /></button>}
      {view === 'home' && <>
        <div className="page-heading"><div><span className="eyebrow">UM TREINO DE CADA VEZ</span><h1>Vamos treinar<span className="accent">?</span></h1><p className="subtitle capitalize">{date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div><span className="heading-decoration" aria-hidden="true"><Dumbbell size={42} strokeWidth={1.3} /></span></div>
        <div className="week-heading"><span>Sua semana</span><button className="text-button" onClick={() => navigate('history')}><CalendarDays size={14} />Calendário</button></div>
        <div className="week-strip" aria-label="Sua semana">{Array.from({ length: 7 }, (_, i) => { const current = new Date(date); const offset = (day + 6) % 7; current.setDate(date.getDate() - offset + i); const weekday = current.getDay(), key = localDateKey(current); const today = key === localDateKey(date); const records = sessionsOnDate(state.history, key); const label = `${days[weekday]}, ${current.getDate()}${today ? ', hoje' : ''}${records.length ? ': ' + records.map(s => s.workoutName).join('; ') : ', sem treino registrado'}`; return <button key={i} data-date={key} className={`week-day ${today ? 'today' : ''} ${records.length ? 'trained' : ''}`} aria-label={label} title={label} onClick={() => setDialog({ type: 'day', date: key })}><span>{['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][weekday]}</span><strong>{current.getDate()}</strong>{records.length ? <DayMarkers sessions={records} /> : <span className="week-marker"><span /></span>}</button>; })}</div>
        <div className="section-heading"><h2>Seus treinos</h2><span>{completedWorkoutIds.size ? `${completedWorkoutIds.size} treino${completedWorkoutIds.size > 1 ? 's' : ''} concluído${completedWorkoutIds.size > 1 ? 's' : ''} hoje` : workoutToday ? `Sugestão de hoje: ${workoutToday.id.toUpperCase()}` : 'Você escolhe a ordem'}</span></div>
        <div className="workout-grid">{state.workouts.map(w => { const completed = completedWorkoutIds.has(w.id); const duplicateName = state.workouts.filter(other => other.name === w.name).length > 1; return <button className={`workout-tile ${completed ? 'workout-done' : ''}`} key={w.id} onClick={() => openWorkout(w)} aria-label={`Abrir treino ${w.name}${duplicateName ? ` (${w.id.toUpperCase()})` : ''}`}><div className="workout-cover"><img src={imageUrl(w.image)} alt={`Ilustração do treino ${w.name}`} fetchPriority={w.day === day ? 'high' : 'auto'} /><span className="workout-letter">{w.id.length === 1 ? w.id.toUpperCase() : <Dumbbell size={15} />}</span>{completed ? <span className="completed-badge"><Check size={11} />Concluído</span> : w.day === day && <span className="today-badge">Sugerido</span>}<span className="cover-arrow"><ArrowRight size={18} /></span></div><div className="workout-caption"><div><h3>{w.name}</h3><p>{days[w.day]} <span>·</span> {w.exercises.length} exercícios</p></div><ArrowRight size={17} /></div></button>; })}</div>
        <div className="home-footer"><Leaf size={16} /><p>{workoutToday ? 'Seu ritmo. Uma série de cada vez.' : 'O descanso também faz parte. Seus treinos continuam por aqui.'}</p></div>
      </>}
      {view === 'workout' && displayedSession && selectedWorkout && <>
        <div className="workout-topline"><button className="back-link" onClick={() => navigate('home')}><ArrowLeft size={17} />Meus treinos</button><span className="workout-badge">TREINO {selectedWorkout.id.toUpperCase()}</span></div>
        <div className="page-heading workout-heading"><div><h1>{displayedSession.workoutName}</h1><p className="subtitle">{displayedSession.exercises.length} exercícios <span>·</span> {displayedProgress.total} séries <span>·</span> {viewingActive && active ? `${Math.max(0, Math.floor((now - active.startedAt) / 60000))} min` : 'Visualização do treino'}</p></div>{viewingActive && <button className="icon-button" onClick={() => setDialog({ type: 'discard' })} aria-label="Descartar treino em andamento"><Trash2 size={19} /></button>}</div>
        <div className="progress-caption"><span>{displayedProgress.done === displayedProgress.total ? 'Treino completo. Mandou bem!' : 'Seu progresso'}</span><span>{displayedProgress.done} de {displayedProgress.total} séries</span></div><div className="progress-track" role="progressbar" aria-label="Progresso do treino" aria-valuenow={displayedProgress.done} aria-valuemin={0} aria-valuemax={displayedProgress.total}><div style={{ width: `${displayedProgress.total ? displayedProgress.done / displayedProgress.total * 100 : 0}%` }} /></div>
        {displayedSession.exercises.some(log => !selectedWorkout.exercises.some(e => e.id === log.exerciseId)) && <p className="subtle legacy-session-note">Exercícios já realizados nesta sessão continuam registrados. A rotina atualizada será usada no próximo treino.</p>}
        <div className="exercise-list">{displayedSession.exercises.map(log => { const exercise = selectedWorkout.exercises.find(e => e.id === log.exerciseId) ?? snapshotExercise(log); const latestId = loadPoints(state, log.exerciseId).at(-1)?.sessionId; const previous = state.history.find(s => s.id === latestId)?.exercises.find(e => canonicalExerciseId(e.exerciseId) === canonicalExerciseId(log.exerciseId)); return <ExerciseRow key={log.exerciseId} exercise={exercise} log={log} previous={previous} onWeight={weight => changeWeight(log.exerciseId, weight)} onToggle={index => toggleSet(exercise, index)} onAddSet={() => addSet(log.exerciseId)} onRest={() => startRest(exercise.rest, exercise.name)} onPreview={() => setPreview({ image: log.image, title: log.name, exerciseId: log.exerciseId })} onProgress={() => openProgress(log.exerciseId)} />; })}</div>
        {viewingActive && restPanel()}
        {viewingActive ? <button className="primary finish-button" disabled={!displayedProgress.done} onClick={() => setDialog({ type: 'finish' })}><Check size={18} />Finalizar treino</button> : <button className="primary finish-button" onClick={() => startWorkout(selectedWorkout)}><Play size={18} />Iniciar treino</button>}
        <p className="workout-hint">{displayedProgress.done ? 'Pode sair e voltar. Seu treino fica salvo.' : 'Toque no número de uma série para marcar como concluída.'}</p>
      </>}
      {view === 'workout' && !selectedWorkout && <div className="empty-state"><Dumbbell size={42} /><h1>Qual vai ser o treino?</h1><p>Escolha um treino para começar.</p><button className="primary" onClick={() => navigate('home')}>Ver meus treinos</button></div>}
      {view === 'progress' && <Progression state={state} exerciseId={progressExercise} onSelect={setProgressExercise} onPreview={(image, title, exerciseId) => setPreview({ image, title, exerciseId })} onOpenSession={id => { const session = state.history.find(s => s.id === id); if (session) setDialog({ type: 'detail', session }); }} />}
      {view === 'history' && <>
        <div className="page-heading"><div><span className="eyebrow">UM PASSO DE CADA VEZ</span><h1>Seu histórico<span className="accent">.</span></h1><p className="subtitle">Cada treino conta. Aqui ficam os seus.</p></div><History className="heading-decoration" size={38} strokeWidth={1.4} /></div>
        <TrainingCalendar history={state.history} now={now} onDate={date => setDialog({ type: 'day', date })} />
        {state.history.length ? <><div className="history-summary"><span><strong>{state.history.length}</strong> {state.history.length === 1 ? 'treino registrado' : 'treinos registrados'}</span><span><strong>{state.history.reduce((n, s) => n + getProgress(s).done, 0)}</strong> séries concluídas</span></div><div className="history-list">{state.history.map(s => <button className="history-row" key={s.id} onClick={() => setDialog({ type: 'detail', session: s })}><span className="history-date"><strong>{new Date(s.finishedAt!).getDate()}</strong><span>{new Date(s.finishedAt!).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span></span><span className="history-copy"><strong>{s.workoutName}</strong><span>{getProgress(s).done}/{getProgress(s).total} séries <span>·</span> {Math.max(1, Math.round((s.finishedAt! - s.startedAt) / 60000))} min</span></span><ChevronRight size={19} /></button>)}</div></> : <div className="empty-state"><div className="empty-illustration"><History size={38} strokeWidth={1.4} /></div><h2>O primeiro é só o começo.</h2><p>Finalize um treino e acompanhe por aqui<br />as cargas e séries que você registrou.</p><button className="primary" onClick={() => navigate('home')}>Escolher um treino<ArrowRight size={17} /></button></div>}
      </>}
      {view === 'settings' && <>
        <div className="page-heading"><div><span className="eyebrow">DO SEU JEITO</span><h1>Ajustes<span className="accent">.</span></h1><p className="subtitle">O essencial para deixar o treino com a sua cara.</p></div></div>
        <section className="settings-section"><h2><Timer size={19} />Descanso</h2><label className="toggle-row"><span><strong>Iniciar ao concluir uma série</strong><small>O cronômetro começa com um toque na série.</small></span><input type="checkbox" role="switch" checked={state.preferences.autoRest} onChange={e => commit(s => ({ ...s, preferences: { ...s.preferences, autoRest: e.target.checked } }))} /></label><label className="toggle-row"><span><strong>Aviso sonoro</strong><small>Um toque curto quando o descanso terminar.</small></span><input type="checkbox" role="switch" checked={state.preferences.sound} onChange={e => commit(s => ({ ...s, preferences: { ...s.preferences, sound: e.target.checked } }))} /></label><p className="subtle">O som depende das permissões do navegador. A contagem é retomada ao reabrir o app.</p></section>
        <section className="settings-section"><h2><Dumbbell size={19} />Meus treinos</h2><p className="subtle">Edite nomes, dias, exercícios, séries e metas.</p>{state.workouts.map(w => <div className="settings-workout" key={w.id}><span className="settings-letter">{w.id.toUpperCase()}</span><span><strong>{w.name}</strong><small>{days[w.day]} · {w.exercises.length} exercícios</small></span><button className="icon-button" aria-label={`Editar ${w.name}`} disabled={active?.workoutId === w.id} title={active?.workoutId === w.id ? 'Finalize ou descarte o treino antes de editar.' : 'Editar treino'} onClick={() => setDialog({ type: 'edit', workout: w })}><Pencil size={17} /></button></div>)}{active && <p className="subtle">Finalize ou descarte o treino em andamento para editar sua estrutura.</p>}</section>
        <section className="settings-section"><h2><ShieldCheck size={19} />Seus dados</h2><p className="subtle">Tudo fica salvo neste aparelho, sem cadastro. Limpar os dados do navegador ou trocar de endereço do app pode remover o acesso aos registros. Exporte backups regularmente.</p><div className="backup-actions"><button className="secondary" onClick={exportBackup}><Download size={17} />Exportar backup</button><button className="secondary" onClick={() => importRef.current?.click()}><Upload size={17} />Importar backup</button></div><p className="subtle">A importação substitui os dados atuais após sua confirmação.</p><button className="text-button" onClick={async () => { try { const granted = await navigator.storage?.persist?.(); setNotice(granted ? 'O navegador concedeu proteção extra ao armazenamento.' : 'O navegador decide automaticamente a proteção dos dados. Mantenha seus backups.'); } catch { setNotice('A proteção depende do navegador. Mantenha seus backups.'); } }}><ShieldCheck size={15} />Solicitar proteção do armazenamento</button></section>
        <section className="settings-section"><h2><Download size={19} />Instalar no celular</h2>{installPrompt ? <button className="primary" onClick={async () => { try { await installPrompt.prompt(); setInstallPrompt(null); } catch { setNotice('Use o menu do navegador para instalar o aplicativo.'); } }}>Instalar Gym Tracker</button> : <p className="subtle">No Chrome do Android, abra o menu ⋮ e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”. Depois do primeiro carregamento, o app também funciona offline.</p>}</section>
        <p className="version-label">Gym Tracker · v1.1 · Feito para o seu ritmo.</p>
      </>}
    </main>
    <nav className="bottom-nav" aria-label="Navegação principal"><button className={view === 'home' || view === 'workout' ? 'active' : ''} onClick={() => navigate('home')}><LayoutGrid size={21} /><span>Treinos</span></button><button className={view === 'progress' ? 'active' : ''} onClick={() => navigate('progress')}><TrendingUp size={21} /><span>Evolução</span></button><button className={dialog?.type === 'timer' ? 'active' : ''} onClick={() => setDialog({ type: 'timer' })}><Timer size={22} /><span>{isRunning ? formatTime(remaining) : 'Descanso'}</span>{isRunning && <span className="nav-dot" />}</button><button className={view === 'history' ? 'active' : ''} onClick={() => navigate('history')}><History size={21} /><span>Histórico</span></button></nav>
    {notice && <div className="toast" role="status"><CircleCheck size={18} /><span>{notice}</span></div>}
    <input ref={importRef} type="file" accept=".json,application/json" hidden aria-label="Selecionar arquivo de backup" onChange={e => { const file = e.target.files?.[0]; if (file) void importBackup(file); e.target.value = ''; }} />
    {dialog?.type === 'timer' && <Modal title="Um respiro entre as séries" onClose={() => setDialog(null)}>{restPanel(true)}<label className="toggle-row"><span><strong>Começar automaticamente</strong><small>Ao marcar uma série como concluída.</small></span><input role="switch" type="checkbox" checked={state.preferences.autoRest} onChange={e => commit(s => ({ ...s, preferences: { ...s.preferences, autoRest: e.target.checked } }))} /></label></Modal>}
    {dialog?.type === 'finish' && active && <Modal title={progress.done === progress.total ? 'Treino completo. Mandou bem!' : 'Finalizar por hoje?'} onClose={() => setDialog(null)}><div className="finish-summary"><CircleCheck size={42} /><strong>{progress.done}<span> de {progress.total} séries</span></strong><p>{active.workoutName}</p></div><p className="subtle">{progress.done === progress.total ? 'Suas cargas e séries serão guardadas no histórico.' : 'As séries concluídas serão guardadas. As restantes ficarão como não realizadas.'}</p><div className="modal-actions"><button className="secondary" onClick={() => setDialog(null)}>Continuar treino</button><button className="primary" onClick={() => { commit(s => finishSession(s)); navigate('history'); setNotice('Treino registrado. Mais um passo dado!'); }}>Salvar e finalizar</button></div></Modal>}
    {dialog?.type === 'discard' && <Modal title="Descartar este treino?" onClose={() => setDialog(null)}><p className="subtle">As séries marcadas nesta sessão serão descartadas. Suas cargas continuarão salvas para o próximo treino.</p><div className="modal-actions"><button className="secondary" onClick={() => setDialog(null)}>Continuar treino</button><button className="danger-button" onClick={() => { commit(s => ({ ...s, active: null, timer: { ...s.timer, started: false, endAt: null, remaining: s.timer.duration } })); navigate('home'); }}>Descartar sessão</button></div></Modal>}
    {dialog?.type === 'switch' && <Modal title="Você já começou um treino" onClose={() => setDialog(null)}><p className="subtle">Seu treino “{active?.workoutName}” está em andamento. Você pode consultar “{dialog.workout.name}” sem interromper o treino atual. Para iniciar este outro treino, finalize o atual ou confirme a troca. As séries não finalizadas do treino atual serão descartadas; as cargas continuam salvas.</p><div className="modal-actions"><button className="secondary" onClick={returnToActive}>Continuar o atual</button><button className="danger-button" onClick={() => { const { workout, firstSet, extraSet } = dialog; commit(s => { const next = beginWorkout(s, workout, firstSet); return extraSet ? addSessionSet(next, extraSet) : next; }); setViewedWorkoutId(workout.id); navigate('workout'); }}>Descartar e trocar</button></div></Modal>}
    {dialog?.type === 'edit' && <WorkoutEditor workout={dialog.workout} onClose={() => setDialog(null)} onSave={workout => { commit(s => ({ ...s, workouts: s.workouts.map(w => w.id === workout.id ? workout : w) })); setDialog(null); setNotice('Treino atualizado.'); }} />}
    {dialog?.type === 'day' && <Modal title={new Date(`${dialog.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} onClose={() => setDialog(null)}>{sessionsOnDate(state.history, dialog.date).length ? sessionsOnDate(state.history, dialog.date).map(s => <button className="day-session" key={s.id} onClick={() => setDialog({ type: 'detail', session: s })}><span><strong>{s.workoutName}</strong><small>{new Date(s.finishedAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {getProgress(s).done}/{getProgress(s).total} séries</small></span><ChevronRight size={17} /></button>) : <div className="calendar-empty"><CalendarDays size={32} /><p>Nenhum treino registrado neste dia.</p></div>}</Modal>}
    {dialog?.type === 'import' && <Modal title="Restaurar este backup?" onClose={() => setDialog(null)}><p className="subtle">O arquivo contém {dialog.data.workouts.length} treinos e {dialog.data.history.length} sessões de histórico. Ele substituirá todos os registros deste aparelho, incluindo o treino em andamento.</p><button className="text-button" onClick={exportBackup}><Download size={16} />Exportar os dados atuais antes</button><div className="modal-actions"><button className="secondary" onClick={() => setDialog(null)}>Cancelar</button><button className="primary" onClick={() => { const data = dialog.data; commit(() => data); setViewedWorkoutId(null); navigate('home'); setNotice('Backup restaurado.'); }}>Substituir e restaurar</button></div></Modal>}
    {dialog?.type === 'detail' && <Modal title={dialog.session.workoutName} onClose={() => setDialog(null)}><p className="subtle capitalize">{new Date(dialog.session.finishedAt!).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {Math.max(1, Math.round((dialog.session.finishedAt! - dialog.session.startedAt) / 60000))} min</p><div className="session-detail">{dialog.session.exercises.map(e => <div className="detail-exercise" key={e.exerciseId}><button className="detail-image-button" aria-label={`Ampliar imagem de ${e.name}`} onClick={() => setPreview({ image: e.image, title: e.name, exerciseId: e.exerciseId })}><img src={imageUrl(e.image)} alt="" /><ZoomIn size={12} /></button><div><strong>{e.name}</strong><MuscleBadge muscle={getMuscle(e)} /><p>{e.weight.toLocaleString('pt-BR')} kg · Meta: {e.target} {e.kind === 'seconds' ? 's' : 'reps'}</p><span>{e.done.filter(Boolean).length}/{e.done.length} séries concluídas</span><button className="text-button" onClick={() => openProgress(e.exerciseId)}><TrendingUp size={13} />Ver evolução</button></div></div>)}</div></Modal>}
    {preview && <ImagePreview image={preview.image} title={preview.title} onClose={() => setPreview(null)} note={preview.exerciseId ? state.exerciseNotes?.[canonicalExerciseId(preview.exerciseId)] : undefined} onNote={preview.exerciseId ? note => commit(s => ({ ...s, exerciseNotes: { ...s.exerciseNotes, [canonicalExerciseId(preview.exerciseId!)]: note } })) : undefined} />}
  </div>;
}
