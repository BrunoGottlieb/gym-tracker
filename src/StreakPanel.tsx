import { Check, CloudOff, Flame, Play, Moon, RefreshCw, Settings, Cloud } from 'lucide-react';
import type { CloudStreakController } from './useCloudStreaks';
import { shiftDate, streakPeople, dateWeekday } from './streaks';
import { StreakFlame, personNames } from './StreakCelebration';
import { planLabels } from './routinePlans';

const statusLabel = (cloud: CloudStreakController) => cloud.status === 'syncing' ? 'Sincronizando…' : cloud.status === 'offline' ? 'Offline · envio pendente' : cloud.status === 'error' ? 'Sincronização pendente' : cloud.lastSync ? `Atualizado às ${new Date(cloud.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando sincronização';

export function StreakPanel({ cloud, onConfigure, onPreview }: { cloud: CloudStreakController; onConfigure: () => void; onPreview: () => void }) {
  const group = cloud.group;
  const sunday = shiftDate(group.today, -dateWeekday(group.today));
  return <section className="streak-panel" aria-label="Sequência compartilhada de treinos">
    <div className="streak-heading"><h2><Flame size={21} />Nossa sequência</h2><button className="icon-button" onClick={() => { void cloud.synchronize(); }} disabled={cloud.status === 'syncing'} aria-label="Sincronizar sequências"><RefreshCw size={17} /></button></div>
    <div className="shared-streak-summary"><StreakFlame /><div>
      <div className="shared-streak-count"><strong>{group.current}</strong><span>{group.current === 1 ? 'treino em sequência' : 'treinos em sequência'}</span></div>
      <p>{group.completedToday ? `${personNames(group.peopleToday)} ${group.peopleToday.length > 1 ? 'mantiveram' : 'manteve'} a chama acesa hoje.` : group.restToday ? 'Descanso do grupo. A chama está preservada.' : 'Quem vai manter a chama acesa hoje?'}</p>
      <div className="streak-week" aria-label="Semana do grupo">{Array.from({ length: 7 }, (_, index) => {
        const date = shiftDate(sunday, index), done = group.dates.includes(date), rest = !group.trainingDays.includes(index);
        return <span key={date} className={`${done ? 'done' : rest ? 'rest' : ''} ${date === group.today ? 'today' : ''}`} title={`${date}: ${done ? 'grupo treinou' : rest ? 'descanso do grupo' : 'sem treino completo'}`}>{done ? <Check size={11} /> : rest ? <Moon size={9} /> : ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][index]}</span>;
      })}</div>
      <small className="streak-best">Melhor sequência do grupo: {group.best}</small>
    </div></div>
    <div className="shared-streak-people">{streakPeople.map(person => <span key={person} data-person={person} className={group.peopleToday.includes(person) ? 'done' : ''}>{group.peopleToday.includes(person) && <Check size={11} />}{planLabels[person]}</span>)}</div>
    <button className="text-button shared-streak-preview" onClick={onPreview}><Play size={13} />Ver animação da chama</button>
    <div className="streak-status">{cloud.status === 'offline' ? <CloudOff size={13} /> : <Cloud size={13} />}<span>{statusLabel(cloud)}{cloud.pending ? ` · ${cloud.pending} ${cloud.pending === 1 ? 'alteração pendente' : 'alterações pendentes'}` : ''}</span><button className="text-button" onClick={onConfigure}><Settings size={13} />Detalhes</button></div>
    {cloud.error && <p className="streak-error">{cloud.error}</p>}
    <p className="stats-method">Basta um de nós salvar um treino completo para manter a sequência de todos. Cada dia conta uma vez. Dias em que todos descansam preservam a chama. Fuso: Brasília.</p>
  </section>;
}

export function StreakSettings({ cloud, onPreview }: { cloud: CloudStreakController; onPreview: () => void }) {
  return <section className="settings-section streak-settings"><h2><Flame size={19} />Sequência compartilhada</h2>
    <p className="subtle">A sequência é do grupo: basta Bruno, Nick ou Ivan concluir um treino no dia. A sincronização é automática, sem login.</p>
    <p className="subtle" role="status">{statusLabel(cloud)}{cloud.pending ? ` · ${cloud.pending} alterações pendentes` : ''}</p>
    <button className="secondary" disabled={cloud.status === 'syncing'} onClick={() => { void cloud.synchronize(); }}><RefreshCw size={15} />Sincronizar agora</button>
    <button className="text-button shared-streak-preview" onClick={onPreview}><Play size={13} />Ver animação da chama</button>
    {cloud.error && <p className="streak-error" role="status">{cloud.error}</p>}
    <p className="subtle">A nuvem recebe pessoa, data e identificador técnico dos treinos. Cargas e detalhes dos exercícios ficam no aparelho. Treinos antigos sem identificação de pessoa não são enviados.</p>
    <p className="subtle">As sequências são compartilhadas entre quem usa este app. Sem contas individuais, elas não são registros privados nem verificação de identidade.</p>
  </section>;
}
