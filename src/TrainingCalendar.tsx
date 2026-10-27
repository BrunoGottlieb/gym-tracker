import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Session } from './types';
import { localDateKey, sessionsOnDate, workoutFocus } from './calendar';
import { MuscleIcon } from './components';

export function DayMarkers({ sessions }: { sessions: Session[] }) {
  const groups = [...new Set(sessions.map(workoutFocus))];
  return <span className="day-markers" aria-hidden="true">{groups.slice(0, 3).map(group => <span key={group} data-muscle={group} className={`day-muscle-icon muscle-${group}`}><MuscleIcon muscle={group} size={11} /></span>)}{groups.length > 3 && <small>+{groups.length - 3}</small>}</span>;
}

export function TrainingCalendar({ history, now, onDate }: { history: Session[]; now: number; onDate: (date: string) => void }) {
  const [month, setMonth] = useState(() => { const date = new Date(now); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const startOffset = month.getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = localDateKey(now);
  return <details className="training-calendar" open>
    <summary><span><CalendarDays size={17} />Calendário de treinos</span><ChevronDown size={17} /></summary>
    <div className="calendar-toolbar"><button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mês anterior"><ChevronLeft size={19} /></button><h2 className="capitalize">{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2><button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Próximo mês"><ChevronRight size={19} /></button></div>
    <div className="calendar-grid" aria-label="Dias do mês"><div className="calendar-weekdays">{['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(day => <span key={day}>{day}</span>)}</div>{Array.from({ length: startOffset }, (_, i) => <span className="calendar-blank" key={`empty-${i}`} />)}{Array.from({ length: count }, (_, i) => {
      const date = new Date(month.getFullYear(), month.getMonth(), i + 1), key = localDateKey(date), sessions = sessionsOnDate(history, key);
      const label = `${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}: ${sessions.length ? sessions.map(s => s.workoutName).join('; ') : 'nenhum treino registrado'}`;
      return <button key={key} data-date={key} className={`calendar-day ${key === today ? 'today' : ''} ${sessions.length ? 'has-training' : ''}`} onClick={() => onDate(key)} aria-label={label} title={label}><strong>{i + 1}</strong><DayMarkers sessions={sessions} /></button>;
    })}</div>
    <p className="calendar-legend"><span><MuscleIcon muscle="chest" />Peito</span><span><MuscleIcon muscle="back" />Costas</span><span><MuscleIcon muscle="legs" />Pernas</span><span><MuscleIcon muscle="shoulders" />Ombros</span></p><p className="subtle">Toque no dia para ver os treinos registrados, incluindo sessões parciais. Você pode fazer qualquer treino em qualquer dia.</p>
  </details>;
}
