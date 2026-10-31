import { useMemo } from 'react';
import { Check, CloudOff, Flame, Moon, RefreshCw, Settings, Cloud } from 'lucide-react';
import type { AppState } from './types';
import type { CloudStreakController } from './useCloudStreaks';
import { defaultTrainingDays, shiftDate, streakDate, streakPeople, streakSummary, dateWeekday } from './streaks';
import { planLabels } from './routinePlans';

const statusLabel = (cloud: CloudStreakController) => cloud.status === 'syncing' ? 'Sincronizando…' : cloud.status === 'offline' ? 'Offline · envio pendente' : cloud.status === 'error' ? 'Sincronização pendente' : cloud.lastSync ? `Atualizado às ${new Date(cloud.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando sincronização';

export function StreakPanel({ state, cloud, onConfigure }: { state: AppState; cloud: CloudStreakController; onConfigure: () => void }) {
  const today = streakDate();
  const rows = useMemo(() => streakPeople.map(person => {
    const remote = cloud.snapshot?.dates.filter(day => day.person === person).map(day => day.date) ?? [];
    const local = cloud.localEvents.filter(event => event.person === person && event.completed).map(event => event.date);
    const dates = [...new Set([...remote, ...local])];
    const trainingDays = (state.selectedPlan ?? 'original') === person ? [...new Set(state.workouts.map(workout => workout.day))] : cloud.snapshot?.trainingDays[person] ?? defaultTrainingDays[person];
    return { person, dates: new Set(dates), trainingDays, ...streakSummary(dates, trainingDays, today) };
  }), [cloud.snapshot, cloud.localEvents, state.selectedPlan, state.workouts, today]);
  const sunday = shiftDate(today, -dateWeekday(today));
  return <section className="streak-panel" aria-label="Sequência compartilhada de treinos">
    <div className="streak-heading"><h2><Flame size={21} />Sequência dos amigos</h2><button className="icon-button" onClick={() => { void cloud.synchronize(); }} disabled={cloud.status === 'syncing'} aria-label="Sincronizar sequências"><RefreshCw size={17} /></button></div>
    <div className="streak-cards">{rows.map(row => <article className={`streak-person ${row.person === (state.selectedPlan ?? 'original') ? 'is-me' : ''}`} key={row.person} data-person={row.person}>
      <span className="streak-person-name">{planLabels[row.person]}{row.person === (state.selectedPlan ?? 'original') && <small>tua ficha</small>}</span>
      <div className={`streak-person-count ${row.current ? 'has-streak' : ''}`}><Flame size={27} /><strong>{row.current}</strong></div>
      <span className="streak-person-caption">{row.current === 1 ? 'treino em sequência' : 'treinos em sequência'}</span>
      <span className={`streak-today ${row.completedToday ? 'done' : ''}`}>{row.completedToday ? <><Check size={13} />Feito hoje</> : row.restToday ? <><Moon size={13} />Descanso</> : 'Falta o treino de hoje'}</span>
      <div className="streak-week" aria-label={`Semana de ${planLabels[row.person]}`}>{Array.from({ length: 7 }, (_, index) => {
        const date = shiftDate(sunday, index), done = row.dates.has(date), rest = !row.trainingDays.includes(index);
        return <span key={date} className={`${done ? 'done' : rest ? 'rest' : ''} ${date === today ? 'today' : ''}`} title={`${date}: ${done ? 'treino completo' : rest ? 'descanso previsto' : 'sem treino completo'}`} aria-label={`${date}: ${done ? 'treino completo' : rest ? 'descanso previsto' : 'sem treino completo'}`}>{done ? <Check size={11} /> : rest ? <Moon size={9} /> : ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][index]}</span>;
      })}</div>
      <small className="streak-best">Melhor sequência: {row.best}</small>
    </article>)}</div>
    <div className="streak-status">{cloud.status === 'offline' ? <CloudOff size={13} /> : <Cloud size={13} />}<span>{statusLabel(cloud)}{cloud.pending ? ` · ${cloud.pending} ${cloud.pending === 1 ? 'alteração pendente' : 'alterações pendentes'}` : ''}</span><button className="text-button" onClick={onConfigure}><Settings size={13} />Detalhes</button></div>
    {cloud.error && <p className="streak-error">{cloud.error}</p>}
    <p className="stats-method">Conta ao salvar um treino com todas as séries concluídas. Descansos previstos preservam a sequência. Hoje ainda dá tempo de treinar. Fuso: Brasília.</p>
  </section>;
}

export function StreakSettings({ cloud }: { cloud: CloudStreakController }) {
  return <section className="settings-section streak-settings"><h2><Flame size={19} />Sequência compartilhada</h2>
    <p className="subtle">A sincronização é automática, sem login. A pessoa é identificada pela ficha selecionada: Bruno, Nick ou Ivan.</p>
    <p className="subtle" role="status">{statusLabel(cloud)}{cloud.pending ? ` · ${cloud.pending} alterações pendentes` : ''}</p>
    <button className="secondary" disabled={cloud.status === 'syncing'} onClick={() => { void cloud.synchronize(); }}><RefreshCw size={15} />Sincronizar agora</button>
    {cloud.error && <p className="streak-error" role="status">{cloud.error}</p>}
    <p className="subtle">A nuvem recebe pessoa, data e identificador técnico dos treinos. Cargas e detalhes dos exercícios ficam no aparelho. Treinos antigos sem identificação de pessoa não são enviados.</p>
    <p className="subtle">As sequências são compartilhadas entre quem usa este app. Sem contas individuais, elas não são registros privados nem verificação de identidade.</p>
  </section>;
}
