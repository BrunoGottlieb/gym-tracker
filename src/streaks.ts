import type { AppState, RoutinePlan, Session } from './types';

export const streakPeople: RoutinePlan[] = ['original', 'sheet', 'ivan'];
export const defaultTrainingDays: Record<RoutinePlan, number[]> = { original: [1, 2, 3, 4, 5], sheet: [1, 2, 3, 4, 5], ivan: [1, 2, 3, 5, 6] };
export const validPerson = (value: unknown): value is RoutinePlan => streakPeople.includes(value as RoutinePlan);
export function streakDate(timestamp = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(timestamp);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}
export function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const dateWeekday = (date: string) => new Date(date + 'T12:00:00Z').getUTCDay();
export function shiftDate(date: string, offset: number): string {
  const value = new Date(date + 'T12:00:00Z'); value.setUTCDate(value.getUTCDate() + offset); return value.toISOString().slice(0, 10);
}
export interface StreakDay { person: RoutinePlan; date: string }
export interface CloudSnapshot { version: 1; today: string; dates: StreakDay[]; trainingDays: Record<RoutinePlan, number[]> }
export interface CompletionEvent extends StreakDay { id: string; completed: boolean }
export function sessionEvent(session: Session): CompletionEvent | null {
  if (!validPerson(session.person) || session.finishedAt === undefined) return null;
  const done = session.exercises.flatMap(log => log.done);
  return { id: session.id, person: session.person, date: streakDate(session.finishedAt), completed: done.length > 0 && done.every(Boolean) };
}
export const eventSignature = (event: CompletionEvent) => `${event.person}|${event.date}|${event.completed}`;
export function completionEvents(state: AppState): CompletionEvent[] {
  const today = streakDate();
  return state.history.map(sessionEvent).filter((event): event is CompletionEvent => !!event && event.date >= '2020-01-01' && event.date <= today);
}
export function streakSummary(dates: string[], trainingDays: number[], today = streakDate()) {
  const completed = new Set(dates.filter(date => isDate(date) && date <= today));
  const required = new Set(trainingDays);
  const first = [...completed].sort()[0];
  let current = 0, best = 0;
  // Rest days preserve the count; only days actually trained increment it.
  if (first) for (let date = first; date <= today; date = shiftDate(date, 1)) {
    if (completed.has(date)) current++;
    else if (date !== today && required.has(dateWeekday(date))) current = 0;
    best = Math.max(best, current);
  }
  return { current, best, completedToday: completed.has(today), restToday: !required.has(dateWeekday(today)), totalDays: completed.size };
}
export function isSnapshot(value: unknown): value is CloudSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as CloudSnapshot;
  return data.version === 1 && isDate(data.today) && Array.isArray(data.dates) && data.dates.length <= 20000 && data.dates.every(day => day && validPerson(day.person) && isDate(day.date)) && !!data.trainingDays && streakPeople.every(person => Array.isArray(data.trainingDays[person]) && data.trainingDays[person].length > 0 && data.trainingDays[person].length <= 7 && data.trainingDays[person].every(day => Number.isInteger(day) && day >= 0 && day <= 6));
}
