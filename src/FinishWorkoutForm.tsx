import { useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { localDateKey, localDateTimeInput } from './calendar';
import { getProgress } from './domain';
import { streakDate } from './streaks';
import type { Session } from './types';

export function FinishWorkoutForm({ session, saving, onSave, onCancel }: {
  session: Session;
  saving: boolean;
  onSave: (startedAt: number, finishedAt: number) => void;
  onCancel: () => void;
}) {
  const [openedAt] = useState(Date.now);
  const fromEarlierDay = localDateKey(session.startedAt) !== localDateKey(openedAt);
  const initialStart = localDateTimeInput(session.startedAt);
  const initialEnd = localDateTimeInput(openedAt);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(fromEarlierDay ? '' : initialEnd);
  const [error, setError] = useState('');
  const { done, total } = getProgress(session);

  return <form onSubmit={event => {
    event.preventDefault();
    if (saving) return;
    const startedAt = start === initialStart ? session.startedAt : new Date(start).getTime();
    const finishedAt = !fromEarlierDay && end === initialEnd ? openedAt : new Date(end).getTime();
    if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt) || localDateTimeInput(startedAt) !== start || localDateTimeInput(finishedAt) !== end) {
      setError('Informe datas e horários válidos para o início e o término.');
      return;
    }
    if (finishedAt < startedAt || finishedAt > Date.now()) {
      setError('O término precisa ser igual ou posterior ao início e não pode estar no futuro.');
      return;
    }
    if (streakDate(finishedAt) < '2020-01-01') {
      setError('Escolha um término a partir de 2020.');
      return;
    }
    setError('');
    onSave(startedAt, finishedAt);
  }}>
    <div className="finish-summary"><CircleCheck size={42} /><strong>{done}<span> de {total} séries</span></strong><p>{session.workoutName}</p></div>
    <p className="subtle">{fromEarlierDay ? 'Este treino começou em outro dia. Informe quando ele terminou.' : 'Confira os horários antes de salvar.'} A data do término é usada para o histórico e a chama.</p>
    <div className="form-grid history-dates finish-dates">
      <label className="form-field">Início do treino<input required type="datetime-local" disabled={saving} value={start} onChange={event => { setStart(event.target.value); setError(''); }} /></label>
      <label className="form-field">Término do treino<input required type="datetime-local" disabled={saving} value={end} onChange={event => { setEnd(event.target.value); setError(''); }} /></label>
    </div>
    {done < total && <p className="subtle">As séries concluídas serão guardadas como treino parcial.</p>}
    {error && <p className="error-text" role="alert">{error}</p>}
    <div className="modal-actions"><button type="button" className="secondary" disabled={saving} onClick={onCancel}>Continuar treino</button><button type="submit" className="primary" disabled={saving}>{saving ? 'Finalizando…' : 'Salvar e finalizar'}</button></div>
  </form>;
}
