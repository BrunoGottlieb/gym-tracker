import { Check, Flame, Moon, RefreshCw } from 'lucide-react';
import { AvatarArt } from './AvatarArt';
import { MinimalBonfire } from './MinimalBonfire';
import { levelProgress } from './gamification';
import { holidayName } from './holidays';
import { planLabels } from './routinePlans';
import { dateWeekday, defaultTrainingDays, scheduledTrainingDays } from './streaks';
import type { AppState } from './types';
import type { CloudStreakController } from './useCloudStreaks';
import type { TeamController } from './useTeamProfiles';
import './team-camp.css';

export function TeamCamp({ cloud, team, state }: { cloud: CloudStreakController; team: TeamController; state: AppState }) {
  const { current, peopleToday, today } = cloud.group;
  const schedules = { ...(cloud.snapshot?.trainingDays ?? defaultTrainingDays), [state.selectedPlan ?? 'original']: scheduledTrainingDays(state.workouts) };
  const members = team.members.map(member => ({ ...member,
    done: peopleToday.includes(member.person),
    rest: !!holidayName(today) || !schedules[member.person].includes(dateWeekday(today)),
  }));
  const status = (member: typeof members[number]) => member.done ? 'Treinou hoje' : member.rest ? 'Dia de descanso' : 'Ainda não treinou';
  return <section className="team-camp" aria-label="Acampamento da equipe">
    <p className="camp-subtitle">Uma série de cada vez. Juntos.</p>
    <div className="camp-streak"><Flame size={19} fill="currentColor" /><strong>{current}</strong> {current === 1 ? 'dia de chama' : 'dias de chama'}</div>
    <div className="camp-scene" aria-label="Bruno, Nick e Ivan em pé ao redor da fogueira">
      <img className="camp-scenery" src={`${import.meta.env.BASE_URL}images/team-camp-scenery.webp`} alt="" />
      <div className="camp-light" />
      {members.map(member => <div key={member.person} className={`camp-person camp-${member.person} ${member.done ? 'camp-done' : ''}`} data-person={member.person}>
        <div className="camp-avatar"><AvatarArt avatar={member.avatar} /></div>
        {member.done && <span className="camp-check" aria-label={`${planLabels[member.person]} treinou hoje`}><Check size={13} strokeWidth={3} /></span>}
        <span className="camp-name">{planLabels[member.person]}</span>
      </div>)}
      <div className="camp-fire"><MinimalBonfire /></div>
    </div>
    <div className="camp-members">{members.map(member => <div className="camp-member" key={member.person}>
      <span className={`camp-member-status ${member.done ? 'done' : member.rest ? 'rest' : ''}`}>{member.done ? <Check size={15} /> : member.rest ? <Moon size={15} /> : <span className="camp-pending-dot" />}</span>
      <div><strong>{planLabels[member.person]}</strong><span>{status(member)}</span></div>
      <small>{member.known ? `Nível ${levelProgress(member.xp).level}` : 'Nível —'}</small>
    </div>)}</div>
    <footer className="camp-footer"><span>{cloud.status === 'sandbox' ? 'Acampamento de teste' : team.offline || cloud.status === 'offline' || cloud.status === 'error' ? 'Últimos dados disponíveis' : 'A chama é de todos nós.'}</span><button className="icon-button" aria-label="Atualizar acampamento" disabled={team.loading || cloud.status === 'syncing'} onClick={() => { team.refresh(); void cloud.synchronize(); }}><RefreshCw size={15} className={team.loading || cloud.status === 'syncing' ? 'spin' : ''} /></button></footer>
  </section>;
}
