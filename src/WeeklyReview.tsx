import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Coins, Target, Trophy, Zap } from 'lucide-react';
import { AvatarArt } from './AvatarArt';
import { profileAvatar } from './avatars';
import { MuscleIcon } from './components';
import { muscleLabels } from './catalog';
import { muscleColors, muscleOrder } from './trainingStats';
import { planLabels } from './routinePlans';
import { weeklyReview, weekStart, shiftWeek } from './weeklyReviewStats';
import type { AppState, Session } from './types';
import './weeklyReview.css';

export function WeeklyReview({ state, now, onBack, onSession }: { state: AppState; now: number; onBack: () => void; onSession: (session: Session) => void }) {
  const [selected, setSelected] = useState(() => weekStart(now));
  const person = state.selectedPlan ?? 'original';
  const review = weeklyReview(state, selected, now);
  const current = selected === weekStart(now);
  const earliest = Math.min(weekStart(now), ...state.history.filter(s => (s.person ?? 'original') === person && s.finishedAt !== undefined).map(s => weekStart(s.finishedAt!)));
  const date = (value: number) => new Date(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
  const maxSets = Math.max(1, ...muscleOrder.map(group => review.volume[group].completedSets));
  return <div className="weekly-review">
    <button className="back-link" onClick={onBack}><ArrowLeft size={17} />Voltar</button>
    <div className="page-heading"><div><span className="eyebrow">SEU RITMO EM NÚMEROS</span><h1>Resumo semanal<span className="accent">.</span></h1></div></div>
    <div className="review-week-picker"><button className="icon-button" disabled={selected <= earliest} aria-label="Semana anterior" onClick={() => setSelected(shiftWeek(selected, -1))}><ChevronLeft size={20} /></button><div aria-live="polite"><strong>{date(selected)} — {date(review.end - 1)}</strong><span>{current ? 'Esta semana' : new Date(selected).getFullYear()} · domingo a sábado</span></div><button className="icon-button" disabled={current} aria-label="Próxima semana" onClick={() => setSelected(shiftWeek(selected, 1))}><ChevronRight size={20} /></button></div>
    <section className="review-hero"><div><span className="review-person">A SEMANA DE {planLabels[person].toLocaleUpperCase('pt-BR')}</span><h2>{review.days >= review.target ? 'Meta conquistada!' : review.days ? 'Cada treino conta.' : 'Uma nova semana.'}</h2><p>{review.days ? `${review.days} ${review.days === 1 ? 'dia de movimento' : 'dias de movimento'}. Um passo de cada vez.` : 'Seus treinos finalizados vão aparecer aqui.'}</p><div className="review-rewards"><span><Zap size={16} />{review.xp} XP</span><span><Coins size={16} />{review.coins} moedas</span></div></div><div className="review-avatar"><AvatarArt avatar={profileAvatar(state)} waistUp /></div></section>
    <section className="review-goal"><div><span><Target size={17} />Meta semanal</span><strong>{review.days} / {review.target} dias</strong></div><div className="game-meter" role="progressbar" aria-label="Meta da semana" aria-valuemin={0} aria-valuemax={review.target} aria-valuenow={Math.min(review.days, review.target)}><span style={{ width: `${Math.min(100, review.days / review.target * 100)}%` }} /></div><div className="review-days">{review.calendar.map(day => <div key={day.key} className={day.sessions.length ? 'trained' : ''} aria-label={`${day.label}: ${day.sessions.length ? `${day.sets} séries feitas` : 'sem treino registrado'}`}><span>{day.label}</span><b>{day.sessions.length ? <Check size={16} /> : day.number}</b></div>)}</div></section>
    <div className="review-numbers"><div><strong>{review.sessions.length}</strong><span>treinos</span></div><div><strong>{review.sets}</strong><span>séries feitas</span></div><div><strong>{review.minutes}</strong><span>min de treino</span></div></div>
    <section className="review-section"><h2>O que você movimentou</h2><p>Séries concluídas por grupo muscular. Toque para ver os exercícios.</p>{!review.sets && <div className="review-empty">Nenhuma série registrada nesta semana.</div>}{muscleOrder.filter(group => review.volume[group].completedSets > 0).map(group => <details className="review-muscle" key={group}><summary><span className="review-muscle-icon" style={{ color: muscleColors[group] }}><MuscleIcon muscle={group} size={23} /></span><span className="review-muscle-copy"><span>{muscleLabels[group]}<b>{review.volume[group].completedSets} séries</b></span><i><i style={{ width: `${review.volume[group].completedSets / maxSets * 100}%`, background: muscleColors[group] }} /></i></span><ChevronRight size={16} /></summary><ul>{review.volume[group].exercises.filter(e => e.completedSets > 0).map(exercise => <li key={exercise.id}><span>{exercise.name}</span><b>{exercise.completedSets}</b></li>)}</ul></details>)}</section>
    {!!review.records.length && <section className="review-section review-records"><h2><Trophy size={19} />Novas marcas</h2>{review.records.map(record => <div key={`${record.name}-${record.unit}`}><span>{record.name}</span><strong>{record.value} {record.unit}</strong></div>)}</section>}
    <section className="review-section"><h2>Seus treinos da semana</h2>{review.sessions.length ? review.sessions.map(session => <button className="review-session" key={session.id} onClick={() => onSession(session)}><span className="review-session-date">{new Date(session.finishedAt!).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}<b>{new Date(session.finishedAt!).getDate()}</b></span><span><strong>{session.workoutName}</strong><small>{session.exercises.reduce((n, e) => n + e.done.filter(Boolean).length, 0)} séries concluídas</small></span><ChevronRight size={17} /></button>) : <p className="review-empty">Ainda não há treinos finalizados.</p>}</section>
    <p className="review-footnote">Somente o histórico de {planLabels[person]}. Meta atual: {review.target} dias por semana. Moedas mostram os ganhos dos treinos, antes das compras.</p>
  </div>;
}

