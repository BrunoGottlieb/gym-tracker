import { Award, Check, LockKeyhole, Sparkles, Target, Trophy, Zap } from 'lucide-react';
import type { CSSProperties } from 'react';
import { auraRewards, equippedAura, levelProgress, personalXP, sessionXP, weeklyGoal, type RewardAura, type WorkoutResult } from './gamification';
import { planLabels } from './routinePlans';
import type { AppState } from './types';
import { MinimalBonfire } from './MinimalBonfire';
import './gamification.css';
import { AvatarArt } from './AvatarArt';
import type { AvatarConfig } from './avatars';

const number = (value: number) => value.toLocaleString('pt-BR');
function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  return <div className="game-meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}><span style={{ width: `${Math.min(100, value / max * 100)}%` }} /></div>;
}

export function WeeklyGoalControl({ state, onChange }: { state: AppState; onChange: (goal: number) => void }) {
  const { target } = weeklyGoal(state);
  return <label className="goal-control">Meta de {planLabels[state.selectedPlan ?? 'original']}<select aria-label="Meta semanal de dias de treino" value={target} onChange={event => onChange(+event.target.value)}>{[1, 2, 3, 4, 5, 6, 7].map(goal => <option value={goal} key={goal}>{goal} {goal === 1 ? 'dia' : 'dias'} / semana</option>)}</select></label>;
}

export function GamificationDashboard({ state, avatar, now, onGoal, onProfile }: { state: AppState; avatar: AvatarConfig; now: number; onGoal: (goal: number) => void; onProfile: () => void }) {
  const xp = personalXP(state.history, state.selectedPlan ?? 'original');
  const level = levelProgress(xp);
  const goal = weeklyGoal(state, now);
  return <section className="game-dashboard" aria-label="XP e meta semanal">
    <div className="game-level"><button className="level-emblem avatar-level-link" aria-label="Ver meu avatar e nível" onClick={onProfile}><AvatarArt avatar={avatar} waistUp /></button><div className="level-info"><div><strong>Nível {level.level}</strong><span>{number(xp)} XP</span></div><Meter value={level.current} max={500} label="XP até o próximo nível" /><small>{number(level.remaining)} XP para o próximo nível</small></div></div>
    <div className={`weekly-goal ${goal.reached ? 'goal-reached' : ''}`}><div className="goal-heading"><span>{goal.reached ? <Trophy size={18} /> : <Target size={18} />}<strong>{goal.reached ? 'Meta da semana alcançada!' : 'Sua meta semanal'}</strong></span><b>{goal.done}<span> / {goal.target} {goal.target === 1 ? 'dia' : 'dias'}</span></b></div><Meter value={goal.done} max={goal.target} label="Dias treinados nesta semana" /><WeeklyGoalControl state={state} onChange={onGoal} /><p>Domingo a sábado · cada dia treinado conta uma vez.</p></div>
  </section>;
}

export function GamificationSettings({ state, onGoal, onAura, onHaptics, sandbox = false, previewAura }: { sandbox?: boolean; previewAura?: RewardAura; state: AppState; onGoal: (goal: number) => void; onAura: (aura: RewardAura) => void; onHaptics: (enabled: boolean) => void }) {
  const level = levelProgress(personalXP(state.history, state.selectedPlan ?? 'original')).level;
  const equipped = auraRewards.find(reward => sandbox && reward.id === previewAura) ?? equippedAura(state);
  return <section className="settings-section"><h2><Zap size={19} />XP e recompensas</h2><p className="subtle">10 XP por série feita, mais 5 XP por série extra e 50 XP ao finalizar. A cada 500 XP, um novo nível. O XP da sessão é guardado ao finalizar.{(state.selectedPlan ?? 'original') !== 'ivan' && ' Para Bruno e Nick, a contagem recomeçou em 13/11/2026. Os treinos anteriores continuam no histórico.'}</p><WeeklyGoalControl state={state} onChange={onGoal} /><label className="toggle-row"><span><strong>Vibração ao marcar uma série</strong><small>Uma confirmação breve, quando o celular permitir.</small></span><input type="checkbox" role="switch" checked={state.preferences.haptics !== false} onChange={event => onHaptics(event.target.checked)} /></label><h3 className="reward-heading">Brilhos da celebração</h3><p className="subtle">Novas cores de luz para sua chama, desbloqueadas pelos níveis.{sandbox && ' Prévia local: todos os brilhos estão disponíveis neste aparelho.'}</p><div className="aura-options">{auraRewards.map(reward => {
    const unlocked = sandbox || level >= reward.level;
    const selected = equipped.id === reward.id;
    return <button key={reward.id} className={selected ? 'equipped' : ''} aria-pressed={selected} disabled={!unlocked} onClick={() => onAura(reward.id)}><i style={{ background: reward.color, boxShadow: `0 0 18px ${reward.color}88` }} /><span><strong>{reward.name}</strong><small>{selected ? 'Equipado' : unlocked ? 'Equipar' : `Nível ${reward.level}`}</small></span>{selected ? <Check size={16} /> : !unlocked ? <LockKeyhole size={14} /> : null}</button>;
  })}</div></section>;
}

export function WorkoutResults({ result, equipped, onEquip, onClose }: { result: WorkoutResult; equipped: RewardAura; onEquip: (aura: RewardAura) => void; onClose: () => void }) {
  const rewards = auraRewards.filter(reward => reward.level > result.levelBefore && reward.level <= result.levelAfter);
  return <div className="workout-results"><div className="result-scroll"><div className="result-medal"><Trophy size={34} /></div><p className="result-workout">{result.session.workoutName}</p><strong className="result-xp">+{number(result.xp.xp)}<span> XP</span></strong><div className="result-stats"><span><b>{result.xp.sets}</b>{result.xp.sets === 1 ? 'série realizada' : 'séries realizadas'}</span><span><b>{result.xp.extra}</b>{result.xp.extra === 1 ? 'série extra' : 'séries extras'}</span><span><b>{Math.max(1, Math.round((result.session.finishedAt! - result.session.startedAt) / 60000))}</b>minutos</span></div><p className="result-breakdown">{result.xp.xp === 0 ? 'Treino registrado. A data informada é anterior ao reinício do XP.' : <>{result.xp.sets * 10} XP em séries{result.xp.extra ? ` + ${result.xp.extra * 5} XP de bônus` : ''} + 50 XP ao finalizar</>}</p>
    {result.goalReached && <div className="result-highlight"><Target size={18} /><strong>Meta semanal alcançada!</strong></div>}
    {result.levelAfter > result.levelBefore && <div className="result-level-up"><Award size={27} /><strong>Você chegou ao nível {result.levelAfter}!</strong><p>Uma série de cada vez. Olha onde você chegou.</p></div>}
    {rewards.map(reward => <div className="reward-unlocked" key={reward.id}><i style={{ background: reward.color, boxShadow: `0 0 25px ${reward.color}` }} /><div><small>NOVA RECOMPENSA</small><strong>{reward.name}</strong></div><button className="secondary compact" disabled={equipped === reward.id} onClick={() => onEquip(reward.id)}>{equipped === reward.id ? 'Equipado' : 'Equipar'}</button></div>)}
    {!!result.records.length && <section className="result-records"><h3><Trophy size={17} />Novos recordes</h3>{result.records.map(record => <div key={record.name}><span>{record.name}<small>{record.assistance ? 'Menor assistência' : record.unit === 's' ? 'Maior sustentação' : 'Maior carga registrada'}</small></span><b>{number(record.previous)} → {number(record.value)} {record.unit}</b></div>)}</section>}
    </div><button className="primary full-width result-continue" onClick={onClose}>Continuar</button>
  </div>;
}

export interface XPFeedbackData { key: number; xp: number; extra: number; exerciseComplete: boolean }
export function XPFeedback({ feedback, inline = false }: { feedback: XPFeedbackData; inline?: boolean }) {
  return <div key={feedback.key} className={`xp-feedback ${feedback.extra ? 'bonus-feedback' : ''} ${inline ? 'feedback-inline' : ''}`} role="status"><div className="xp-burst" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--particle-angle': `${index * 45}deg`, '--particle-color': index % 2 ? '#FED169' : '#91B3FF' } as CSSProperties} />)}</div><Sparkles size={22} /><span><strong>+{feedback.xp} XP</strong><small>{feedback.extra ? `Série extra! +${feedback.extra * 5} XP de bônus` : feedback.exerciseComplete ? 'Exercício concluído!' : 'Série concluída!'}</small></span></div>;
}

export function SessionXP({ session }: { session: NonNullable<AppState['active']> }) {
  return <span className="session-xp"><Zap size={14} />{sessionXP(session, false).xp} XP nesta sessão</span>;
}

export function RestDayNote({ flameProtected }: { flameProtected: boolean }) {
  return <aside className="game-rest-day"><MinimalBonfire knight compact /><div><strong>Hoje também é dia de evoluir.</strong><p>{flameProtected ? 'Hoje a chama está protegida pelo descanso. Recupere as energias.' : 'Descanso previsto na sua ficha. A chama continua em equipe.'}</p></div></aside>;
}
