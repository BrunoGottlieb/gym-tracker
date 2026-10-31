import { useId } from 'react';
import { Flame, Play, RefreshCw } from 'lucide-react';
import type { CloudStreakController } from './useCloudStreaks';
import { planLabels } from './routinePlans';

const statusLabel = (cloud: CloudStreakController) => cloud.status === 'syncing' ? 'Sincronizando…' : cloud.status === 'offline' ? 'Offline · envio pendente' : cloud.status === 'error' ? 'Sincronização pendente' : cloud.lastSync ? `Atualizado às ${new Date(cloud.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando sincronização';

export function StreakBadge({ cloud, onClick }: { cloud: CloudStreakController; onClick: () => void }) {
  const count = cloud.group.peopleToday.length;
  const gradient = useId();
  return <button className={`streak-header-badge ${count ? 'is-lit' : ''}`} onClick={onClick} aria-haspopup="dialog" aria-label={`Chama de hoje: ${count} ${count === 1 ? 'pessoa treinou' : 'pessoas treinaram'}. Ver participantes`}>
    <svg className="badge-flame" viewBox="0 0 40 48" aria-hidden="true"><defs><linearGradient id={gradient} x1="9" y1="6" x2="29" y2="45" gradientUnits="userSpaceOnUse"><stop stopColor={count ? '#FFBC48' : '#CBD1DC'} /><stop offset="1" stopColor={count ? '#F77724' : '#A5AEBD'} /></linearGradient></defs><path fill={`url(#${gradient})`} d="M21 2C23 12 15 14 14 22C10 21 9 17 9 17C2 25 3 35 9 41C15 48 29 47 35 38C41 29 32 20 31 14C29 17 28 20 28 22C23 17 27 9 21 2Z"/><path fill={count ? '#FFE796' : '#EBEEF3'} d="M21 23C21 29 14 29 13 35C12 41 17 44 22 43C30 42 31 34 26 30C26 33 24 33 24 33C25 29 23 26 21 23Z"/></svg>
    <span aria-hidden="true">{count}</span>
  </button>;
}

export function StreakDetails({ cloud }: { cloud: CloudStreakController }) {
  const { current, peopleToday } = cloud.group;
  return <section className="streak-mini" aria-label="Participantes da sequência">
    <div className="streak-mini-count"><strong>{current}</strong><span>{current === 1 ? 'dia de chama' : 'dias de chama'}</span></div>
    <div className="streak-mini-today"><h3>Treinaram hoje</h3>{peopleToday.length ? <div className="streak-mini-names">{peopleToday.map(person => <span key={person} data-person={person}>{planLabels[person]}</span>)}</div> : <p>Ninguém ainda</p>}</div>
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
