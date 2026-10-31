import { useMemo, useState } from 'react';
import { Check, CloudOff, Copy, Flame, Moon, RefreshCw, Settings, ShieldCheck } from 'lucide-react';
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
  if (!cloud.enabled) return <section className="streak-connect-banner"><span className="streak-flame"><Flame size={26} /></span><div><h2>Uma sequência para treinar juntos</h2><p>Conecte Bruno, Nick e Ivan com o código da sala.</p></div><button className="secondary" onClick={onConfigure}>Conectar</button></section>;
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
    <div className="streak-status">{cloud.status === 'offline' ? <CloudOff size={13} /> : <ShieldCheck size={13} />}<span>{statusLabel(cloud)}{cloud.pending ? ` · ${cloud.pending} ${cloud.pending === 1 ? 'alteração pendente' : 'alterações pendentes'}` : ''}</span><button className="text-button" onClick={onConfigure}><Settings size={13} />Sala</button></div>
    {cloud.error && <p className="streak-error">{cloud.error}</p>}
    <p className="stats-method">Conta ao salvar um treino com todas as séries concluídas. Descansos previstos preservam a sequência. Hoje ainda dá tempo de treinar. Fuso: Brasília.</p>
  </section>;
}

export function StreakSettings({ cloud }: { cloud: CloudStreakController }) {
  const [code, setCode] = useState(cloud.code);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  return <section className="settings-section streak-settings"><h2><Flame size={19} />Sequência compartilhada</h2>
    <p className="subtle">Use o mesmo código de sala nos três celulares. A pessoa é identificada pela ficha selecionada: Bruno, Nick ou Ivan. Quem possui o código compartilha acesso aos três perfis, sem login individual.</p>
    <form onSubmit={async event => { event.preventDefault(); setSaving(true); setMessage(''); try { await cloud.connect(code); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível conectar.'); } finally { setSaving(false); } }}>
      <label className="form-field">Código da sala<input type="password" autoComplete="off" autoCapitalize="characters" spellCheck={false} minLength={12} maxLength={120} value={code} onChange={event => setCode(event.target.value)} placeholder="Cole o código compartilhado" /></label>
      <div className="backup-actions"><button className="primary" type="submit" disabled={saving || cloud.status === 'syncing'}>{saving ? 'Conectando…' : cloud.enabled ? 'Trocar código' : 'Conectar sala'}</button>{cloud.enabled && <button className="secondary" type="button" disabled={cloud.status === 'syncing'} onClick={() => { void cloud.synchronize(); }}>Sincronizar agora</button>}</div>
    </form>
    {cloud.enabled && <><p className="subtle">{statusLabel(cloud)}{cloud.pending ? ` · ${cloud.pending} alterações pendentes` : ''}</p><div className="streak-settings-actions"><button className="text-button" onClick={async () => { try { await navigator.clipboard.writeText(cloud.code); setMessage('Código copiado. Compartilhe apenas com o grupo.'); } catch { setMessage('A cópia depende da permissão do navegador.'); } }}><Copy size={14} />Copiar código da sala</button><button className="text-button" disabled={saving} onClick={async () => { await cloud.disconnect(); setCode(''); setMessage('Sincronização desconectada neste aparelho.'); }}>Desconectar deste aparelho</button></div></>}
    {(cloud.error || message) && <p className="subtle" role="status">{message || cloud.error}</p>}
    <p className="subtle">A nuvem recebe pessoa, data e identificador técnico dos treinos. Cargas e detalhes dos exercícios ficam no aparelho. Treinos antigos sem identificação de pessoa não são enviados. O código fica salvo neste navegador, separado do backup dos treinos.</p>
  </section>;
}
