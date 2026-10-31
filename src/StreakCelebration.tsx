import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { RotateCcw } from 'lucide-react';
import { database } from './storage';
import { isDate } from './streaks';
import { planLabels } from './routinePlans';
import type { RoutinePlan } from './types';
import type { CloudStreakController } from './useCloudStreaks';
import './streak-celebration.css';

export function StreakFlame({ className = '' }: { className?: string }) {
  return <svg className={`shared-flame ${className}`} viewBox="0 0 120 150" fill="none" aria-hidden="true"><path className="flame-outer" fill="#FF8A00" d="M58 5C80 17 94 36 89 60C87 69 90 77 96 82C98 75 102 69 108 66C107 84 120 96 116 115C112 137 91 148 61 148C30 148 8 133 5 111C2 91 15 77 24 62C28 66 30 72 31 77C47 59 62 43 58 5Z"/><path className="flame-inner" fill="#FFD54A" d="M65 64C49 70 39 84 42 99C35 97 31 91 30 87C19 108 27 135 51 141C75 147 96 133 95 113C94 93 64 87 65 64Z"/></svg>;
}
export function personNames(people: RoutinePlan[]) {
  const names = people.map(person => planLabels[person]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : names[0];
}
interface Celebration { people: RoutinePlan[]; count: number; preview: boolean }

function CelebrationScreen({ data, onClose }: { data: Celebration; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    const node = dialog.current!; node.showModal();
    node.querySelector<HTMLButtonElement>('.celebration-continue')?.focus({ preventScroll: true });
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; if (node.open) node.close(); };
  }, []);
  return <dialog ref={dialog} className="streak-celebration" aria-labelledby="celebration-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="celebration-stage" key={replay} data-replay={replay}>
      <header className="celebration-brand">gym tracker<span>.</span></header>
      {data.preview && <span className="celebration-preview">Prévia da animação</span>}
      <div className="celebration-content">
        <div className="celebration-art">
          <span className="celebration-halo" /><span className="celebration-ring" /><span className="celebration-ring celebration-ring-echo" />
          <div className="celebration-flight-trail" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--trail-delay': `${90 + index * 38}ms`, '--trail-size': `${3 + index % 4}px`, '--trail-offset': `${(index % 5 - 2) * 9}px`, '--trail-color': ['#FFD54A', '#FFAE33', '#FFF2B5'][index % 3] } as CSSProperties} />)}</div>
          <div className="celebration-sparks">{Array.from({ length: 20 }, (_, index) => <i key={index} style={{ '--angle': `${index * 137.508}deg`, '--spark-delay': `${1800 + index % 4 * 45}ms`, '--distance': `${82 + index % 5 * 14}px` } as CSSProperties} />)}</div>
          <div className="celebration-flame-arrival"><StreakFlame /></div>
        </div>
        <h1 id="celebration-title" className="celebration-title"><strong>{personNames(data.people)}</strong><span>{data.people.length > 1 ? 'mantiveram a' : 'manteve a'}<br />chama acesa!</span></h1>
        <div className="celebration-count"><StreakFlame /><span>{data.count} {data.count === 1 ? 'treino' : 'treinos'} em sequência</span></div>
      </div>
      <footer className="celebration-actions">
        <button className="celebration-replay" onClick={() => setReplay(value => value + 1)}><RotateCcw size={15} />Repetir animação</button>
        <button className="celebration-continue" onClick={onClose} autoFocus>Continuar</button>
      </footer>
    </div>
  </dialog>;
}

export function StreakCelebration({ cloud, person, blocked, previewRequest }: { cloud: CloudStreakController; person: RoutinePlan; blocked: boolean; previewRequest: number }) {
  const [seen, setSeen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const [screen, setScreen] = useState<Celebration | null>(null);
  const handledPreview = useRef(0);
  useEffect(() => { const update = () => setVisible(!document.hidden); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  useEffect(() => { let alive = true; database.sync.get('streak-celebration-seen').then(record => {
    if (alive) { setSeen(isDate(record?.value) ? record.value : null); setReady(true); }
  }).catch(() => { if (alive) setReady(true); }); return () => { alive = false; }; }, []);
  useEffect(() => {
    if (!ready || !visible || !cloud.loaded || blocked || screen || seen === cloud.group.today || !cloud.group.completedToday) return;
    const { today, peopleToday, current } = cloud.group;
    setSeen(today); setScreen({ people: peopleToday, count: current, preview: false });
    // Separate from workout backups. StrictMode, reloads and replay never reset it.
    void database.sync.put({ id: 'streak-celebration-seen', value: today }).catch(() => {});
  }, [ready, visible, cloud.loaded, cloud.group, blocked, screen, seen]);
  useEffect(() => {
    if (!previewRequest || previewRequest === handledPreview.current) return;
    handledPreview.current = previewRequest;
    setScreen({ people: cloud.group.peopleToday.length ? cloud.group.peopleToday : [person], count: cloud.group.current, preview: true });
  }, [previewRequest, cloud.group, person]);
  return screen && <CelebrationScreen data={screen} onClose={() => setScreen(null)} />;
}
