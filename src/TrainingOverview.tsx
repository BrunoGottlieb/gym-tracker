import { useMemo, useState } from 'react';
import { Check, ChevronRight, Minus } from 'lucide-react';
import { exerciseIllustrationUrl } from './motionCatalog';
import { MuscleIcon } from './components';
import { getMuscle, muscleLabels } from './catalog';
import { weeklyMuscleVolume, completedWorkoutAverages, muscleColors, muscleOrder, plannedMuscleCounts } from './trainingStats';
import type { ExerciseLog, MuscleGroup, RoutinePlan, Session, Workout } from './types';

const number = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function WeeklyMuscleSummary({ workouts, history, person, now, onSelect, onSelectVolume }: { onSelectVolume: (group: MuscleGroup) => void; workouts: Workout[]; history: Session[]; person: RoutinePlan; now: number; onSelect: (group: MuscleGroup) => void }) {
  const counts = useMemo(() => plannedMuscleCounts(workouts), [workouts]);
  const volume = useMemo(() => weeklyMuscleVolume(workouts, history, person, now), [workouts, history, person, now]);
  const groups = muscleOrder.filter(group => group !== 'other' || counts.other > 0);
  return <section className="weekly-muscle-summary" aria-label="Exercícios por grupo muscular na semana">
    <h2>Sua semana por grupo muscular</h2>
    <p className="subtle">Quantidade de exercícios na ficha atual, contando cada vez que aparecem em um treino. Considera o grupo muscular principal.{workouts.some(workout => workout.optional) && ' Inclui os treinos opcionais.'}</p>
    <div className="weekly-muscle-grid">{groups.map(group => <button type="button" onClick={() => onSelect(group)} key={group} className="weekly-muscle-item" data-muscle={group} aria-label={`${muscleLabels[group]}: ${counts[group]} ${counts[group] === 1 ? 'exercício' : 'exercícios'} na semana`}>
      <span className="stats-muscle-icon" style={{ color: muscleColors[group], backgroundColor: `${muscleColors[group]}15` }}><MuscleIcon muscle={group} size={26} /></span>
      <span><strong>{counts[group]}</strong><small>{muscleLabels[group]}</small></span>
    </button>)}</div>
    <div className="weekly-actual-list"><div className="weekly-actual-heading"><h3>O que saiu do papel</h3><span>Esta semana</span></div>
      <table><caption className="sr-only">Volume da ficha e realizado nesta semana. Três séries equivalem a um exercício.</caption><thead><tr><th scope="col">Grupo</th><th scope="col">Ficha</th><th scope="col">Feitos</th></tr></thead><tbody>{muscleOrder.filter(group => group !== 'other' || volume.other.plannedSets > 0 || volume.other.completedSets > 0).map(group => <tr key={group} data-muscle={group} data-completed={volume[group].completedSets / 3} data-sets={volume[group].completedSets} className="weekly-volume-row" onClick={() => onSelectVolume(group)}>
        <th scope="row"><button type="button" className="weekly-actual-group" aria-label={`Detalhar ${muscleLabels[group]}: ${volume[group].completedSets} de ${volume[group].plannedSets} séries`}><span className="stats-muscle-icon" style={{ color: muscleColors[group], backgroundColor: `${muscleColors[group]}15` }}><MuscleIcon muscle={group} size={21} /></span>{muscleLabels[group]}<ChevronRight size={12} /></button></th>
        <td className="weekly-actual-planned">{number(volume[group].plannedSets / 3)}<small>{volume[group].plannedSets} séries</small></td><td><span className={`weekly-actual-count ${volume[group].completedSets ? 'has-completed' : ''}`}>{volume[group].completedSets ? <Check size={15} /> : <Minus size={13} />}{number(volume[group].completedSets / 3)}</span><small>{volume[group].completedSets} séries</small></td>
      </tr>)}</tbody></table>
      <p><strong>3 séries = 1 exercício equivalente.</strong> Inclui séries extras e exercícios parciais em treinos finalizados, de domingo até hoje. Toque em um grupo para comparar os exercícios.</p>
    </div>
  </section>;
}

export function WorkoutMuscleSummary({ exercises }: { exercises: ExerciseLog[] }) {
  const counts = useMemo(() => {
    const result = Object.fromEntries(muscleOrder.map(group => [group, 0])) as Record<MuscleGroup, number>;
    for (const exercise of exercises) result[getMuscle(exercise)]++;
    return result;
  }, [exercises]);
  return <div className="workout-muscle-summary" aria-label="Composição do treino por grupo muscular">{muscleOrder.filter(group => counts[group] > 0).map(group => <span key={group} data-muscle={group} title={`${muscleLabels[group]}: ${counts[group]} exercícios`} aria-label={`${muscleLabels[group]}: ${counts[group]} ${counts[group] === 1 ? 'exercício' : 'exercícios'}`} style={{ color: muscleColors[group], backgroundColor: `${muscleColors[group]}12` }}><MuscleIcon muscle={group} size={20} /><strong>{counts[group]}</strong><small>{muscleLabels[group]}</small></span>)}</div>;
}

export function WeeklyCompletedChart({ history,workouts,person }: { history: Session[];workouts:Workout[];person:RoutinePlan }) {
  const rows = useMemo(() => completedWorkoutAverages(history,workouts,person), [history,workouts,person]);
  const [selected, setSelected] = useState<string | null>(null);
  const groups = muscleOrder.filter(group => rows.some(row => row.totals[group] > 0));
  const maximum = Math.max(5, Math.ceil(Math.max(...rows.map(row => row.total)) / 5) * 5);
  const detail = selected === null ? undefined : rows.find(row=>row.workoutId===selected);
  return <section className="weekly-completed-chart" aria-label="Média de séries realizadas por tipo de treino">
    <h2>Séries realizadas por treino</h2>
    <p className="subtle">Todo o histórico deste perfil · média por execução de cada treino, independentemente do dia da semana. As cores mostram o grupo muscular principal de cada série.</p>
    {!groups.length && <p className="stats-chart-empty">Registre séries realizadas para começar a ver suas médias aqui.</p>}
    <div className="weekday-chart-layout">
      <div className="weekday-y-axis" aria-hidden="true"><span>{number(maximum)}</span><span>{number(maximum / 2)}</span><span>0</span></div>
      <div className="weekday-plot"><div className="weekday-grid-lines" aria-hidden="true"><i /><i /><i /></div>
        <div className="weekday-bars" style={{gridTemplateColumns:`repeat(${rows.length},minmax(0,1fr))`}}>{rows.map(row => <button key={row.workoutId} type="button" className={`weekday-bar-button ${selected === row.workoutId ? 'selected' : ''}`} disabled={!row.sessions} aria-pressed={selected === row.workoutId} data-workout={row.workoutId} aria-label={`${`${row.label} · ${row.name}`}: ${row.sessions ? `${number(row.total)} séries em média, ${row.sessions} ${row.sessions === 1 ? 'treino registrado' : 'treinos registrados'}` : 'sem registros'}`} onClick={() => setSelected(row.workoutId)}>
          <span className="weekday-bar-value">{row.sessions ? number(row.total) : '—'}</span>
          <span className="weekday-bar-stack" style={{ height: `${row.total / maximum * 180}px` }}>{groups.map(group => row.averages[group] > 0 && <span key={group} data-muscle={group} data-average={row.averages[group]} style={{ height: `${row.averages[group] / row.total * 100}%`, backgroundColor: muscleColors[group] }}><span className="sr-only">{muscleLabels[group]}: {number(row.averages[group])} séries</span></span>)}</span>
          <span className="weekday-bar-label">{row.label}</span>
        </button>)}</div>
      </div>
    </div>
    {!!groups.length && <div className="stats-chart-legend">{groups.map(group => <span key={group}><i style={{ backgroundColor: muscleColors[group] }} /><MuscleIcon muscle={group} size={17} />{muscleLabels[group]}</span>)}</div>}
    {detail && <div className="weekday-chart-detail" aria-live="polite"><strong>{`${detail.label} · ${detail.name}`} · {number(detail.total)} séries em média</strong><p>{detail.sessions} {detail.sessions === 1 ? 'treino registrado' : 'treinos registrados'}</p><div>{muscleOrder.filter(group => detail.totals[group] > 0).map(group => <span key={group}><i style={{ backgroundColor: muscleColors[group] }} />{muscleLabels[group]}<b>{number(detail.averages[group])}</b></span>)}</div></div>}
    <p className="stats-method">Conta somente séries marcadas como feitas, incluindo treinos parciais. Cada sessão finalizada conta uma execução do respectivo treino. Treinos sem registro aparecem sem média. Toque em uma barra para ver os detalhes.</p>
  </section>;
}


export function WeeklyMuscleVolumeDetails({ workouts, history, person, now, muscle }: { workouts: Workout[]; history: Session[]; person: RoutinePlan; now: number; muscle: MuscleGroup }) {
  const volume = useMemo(() => weeklyMuscleVolume(workouts, history, person, now)[muscle], [workouts, history, person, now, muscle]);
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return <section className="weekly-volume-details" aria-label={`Comparação de séries de ${muscleLabels[muscle]}`}>
    <div className="weekly-volume-totals"><div><small>Na ficha</small><strong>{volume.plannedSets}<span> séries</span></strong><p>{number(volume.plannedSets / 3)} exercícios equivalentes</p></div><div><small>Feitas nesta semana</small><strong>{volume.completedSets}<span> séries</span></strong><p>{number(volume.completedSets / 3)} exercícios equivalentes</p></div></div>
    <p className="weekly-volume-help">Comparação com a ficha atual. Um exercício repetido em vários treinos reúne todas as séries da semana.</p>
    <div className="weekly-volume-exercises">{volume.exercises.map(exercise => {
      const extra = exercise.plannedSets === 0, missing = exercise.completedSets === 0;
      const optional = exercise.plannedIn.length > 0 && exercise.plannedIn.every(p => p.optional);
      const status = extra ? 'Fora da ficha' : missing ? optional ? 'Opcional · ainda não feito' : 'Ainda não feito' : exercise.completedSets < exercise.plannedSets ? `Faltam ${exercise.plannedSets - exercise.completedSets} séries` : exercise.completedSets > exercise.plannedSets ? `+${exercise.completedSets - exercise.plannedSets} séries` : 'Meta cumprida';
      return <article key={exercise.id} className={`weekly-volume-exercise ${extra ? 'volume-extra' : missing ? 'volume-missing' : exercise.completedSets < exercise.plannedSets ? 'volume-partial' : ''}`} data-exercise={exercise.id}>
        <div className="volume-exercise-header"><img src={exerciseIllustrationUrl(exercise.id, exercise.image)} alt="" /><div><h3>{exercise.name}</h3><span className="volume-exercise-status">{status}</span></div></div>
        <div className="volume-exercise-numbers"><span>Ficha <b>{exercise.plannedSets}</b> séries</span><span>Feitas <b>{exercise.completedSets}</b> séries</span></div>
        {exercise.plannedIn.length > 0 && <p className="volume-exercise-plan">{exercise.plannedIn.map((entry, i) => <span key={i}>{days[entry.day]}{entry.optional ? ' (opcional)' : ''}: {entry.sets} séries{ i < exercise.plannedIn.length - 1 ? ' · ' : ''}</span>)}</p>}
        {!!exercise.sessions.length && <details><summary>Ver sessões ({exercise.sessions.length})</summary><ul>{exercise.sessions.map((session, i) => <li key={`${session.id}-${i}`}><span>{new Date(session.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · {session.workoutName}{session.extra ? ' · troca / extra' : ''}</span><b>{session.sets} séries</b></li>)}</ul></details>}
      </article>;
    })}</div>
    {!volume.exercises.length && <p className="weekly-volume-help">Nenhum exercício previsto ou realizado para este grupo nesta semana.</p>}
  </section>;
}
