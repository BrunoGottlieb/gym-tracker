import { useMemo, useState } from 'react';
import { MuscleIcon } from './components';
import { muscleLabels } from './catalog';
import { completedWeekdayAverages, muscleColors, muscleOrder, plannedMuscleCounts } from './trainingStats';
import type { Session, Workout } from './types';

const shortDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const fullDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const number = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function WeeklyMuscleSummary({ workouts }: { workouts: Workout[] }) {
  const counts = useMemo(() => plannedMuscleCounts(workouts), [workouts]);
  const groups = muscleOrder.filter(group => group !== 'other' || counts.other > 0);
  return <section className="weekly-muscle-summary" aria-label="Exercícios por grupo muscular na semana">
    <h2>Sua semana por grupo muscular</h2>
    <p className="subtle">Quantidade de exercícios na ficha atual, contando cada vez que aparecem em um treino. Considera o grupo muscular principal.</p>
    <div className="weekly-muscle-grid">{groups.map(group => <div key={group} className="weekly-muscle-item" data-muscle={group} aria-label={`${muscleLabels[group]}: ${counts[group]} ${counts[group] === 1 ? 'exercício' : 'exercícios'} na semana`}>
      <span className="stats-muscle-icon" style={{ color: muscleColors[group], backgroundColor: `${muscleColors[group]}15` }}><MuscleIcon muscle={group} size={26} /></span>
      <span><strong>{counts[group]}</strong><small>{muscleLabels[group]}</small></span>
    </div>)}</div>
  </section>;
}

export function WeeklyCompletedChart({ history }: { history: Session[] }) {
  const rows = useMemo(() => completedWeekdayAverages(history), [history]);
  const [selected, setSelected] = useState<number | null>(null);
  const groups = muscleOrder.filter(group => rows.some(row => row.totals[group] > 0));
  const maximum = Math.max(5, Math.ceil(Math.max(...rows.map(row => row.total)) / 5) * 5);
  const detail = selected === null ? undefined : rows[selected];
  return <section className="weekly-completed-chart" aria-label="Média de séries realizadas por dia da semana">
    <h2>Séries realizadas por dia da semana</h2>
    <p className="subtle">Todo o histórico · média por dia com treino registrado. As cores mostram o grupo muscular principal de cada série.</p>
    {!groups.length && <p className="stats-chart-empty">Registre séries realizadas para começar a ver suas médias aqui.</p>}
    <div className="weekday-chart-layout">
      <div className="weekday-y-axis" aria-hidden="true"><span>{number(maximum)}</span><span>{number(maximum / 2)}</span><span>0</span></div>
      <div className="weekday-plot"><div className="weekday-grid-lines" aria-hidden="true"><i /><i /><i /></div>
        <div className="weekday-bars">{rows.map(row => <button key={row.weekday} type="button" className={`weekday-bar-button ${selected === row.weekday ? 'selected' : ''}`} disabled={!row.days} aria-pressed={selected === row.weekday} data-weekday={row.weekday} aria-label={`${fullDays[row.weekday]}: ${row.days ? `${number(row.total)} séries em média, ${row.days} ${row.days === 1 ? 'dia registrado' : 'dias registrados'}` : 'sem registros'}`} onClick={() => setSelected(row.weekday)}>
          <span className="weekday-bar-value">{row.days ? number(row.total) : '—'}</span>
          <span className="weekday-bar-stack" style={{ height: `${row.total / maximum * 180}px` }}>{groups.map(group => row.averages[group] > 0 && <span key={group} data-muscle={group} data-average={row.averages[group]} style={{ height: `${row.averages[group] / row.total * 100}%`, backgroundColor: muscleColors[group] }}><span className="sr-only">{muscleLabels[group]}: {number(row.averages[group])} séries</span></span>)}</span>
          <span className="weekday-bar-label">{shortDays[row.weekday]}</span>
        </button>)}</div>
      </div>
    </div>
    {!!groups.length && <div className="stats-chart-legend">{groups.map(group => <span key={group}><i style={{ backgroundColor: muscleColors[group] }} /><MuscleIcon muscle={group} size={17} />{muscleLabels[group]}</span>)}</div>}
    {detail && <div className="weekday-chart-detail" aria-live="polite"><strong>{fullDays[detail.weekday]} · {number(detail.total)} séries em média</strong><p>{detail.days} {detail.days === 1 ? 'dia registrado' : 'dias registrados'}</p><div>{muscleOrder.filter(group => detail.totals[group] > 0).map(group => <span key={group}><i style={{ backgroundColor: muscleColors[group] }} />{muscleLabels[group]}<b>{number(detail.averages[group])}</b></span>)}</div></div>}
    <p className="stats-method">Conta somente séries marcadas como feitas, incluindo treinos parciais. Soma sessões da mesma data antes da média. Dias sem registro ficam fora do cálculo. Toque em uma barra para ver os detalhes.</p>
  </section>;
}
