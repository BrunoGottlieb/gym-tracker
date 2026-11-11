import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './exercise-motion.css';

const motionImages: Record<string, Record<string, number>> = {
  a: { 'bench-press': 0, 'incline-dumbbell': 21, 'pec-deck': 2,
    'parallel-bar-dips': 36, 'rope-pushdown': 3, 'bar-pushdown': 23, 'front-plank':54 },
  b: { 'assisted-pullup': 68, 'chest-supported-row': 31, 'preacher-curl': 10,
    'rope-curl': 32, 'face-pull': 67 },
  c: { 'lever-squat': 66, 'leg-press': 12, 'leg-extension': 13,
    'leg-curl': 14, 'lying-leg-curl': 56, 'hip-abduction': 64, 'calf-raise': 16 },
  d: { 'incline-dumbbell': 21, 'parallel-bar-dips': 36,
    'rope-pushdown': 3, 'military-situp': 35 },
  e: { 'assisted-pullup': 68, 'preacher-curl': 10,
    'cable-curl': 29, 'rope-curl': 32, 'cable-lateral-raise': 59, 'shoulder-press': 18, 'face-pull': 67 },
  home: { 'tuck-front-lever': 24, 'hanging-leg-raise': 49 },
};

const sharedMotionImages: Record<string, number> = {
  'decline-situp': 34, 'cable-row': 7,
  pushup: 45, 'incline-machine': 30, 'vertical-chest-press': 46,
  crossover: 22, 'dumbbell-shoulder-press': 47, 'front-raise': 48, 'lateral-raise': 19,
};

export function sharedExerciseMotionId(id: string | undefined, image: number) {
  return id && sharedMotionImages[id] === image ? id : undefined;
}

// Some animations are shared by all profiles. The original set remains tied to Bruno's workouts.
export function exerciseMotionId(plan: string | undefined, workout: string, id: string, image: number) {
  const shared = sharedExerciseMotionId(id, image);
  if (shared) return shared;
  return (!plan || plan === 'original') && motionImages[workout]?.[id] === image ? id : undefined;
}

export function workoutCoverUrl(plan: string | undefined, workout: string, image: number) {
  const base = `${import.meta.env.BASE_URL}images/`;
  if (plan === 'sheet' && workout === 'd' && image === 47) {
    return `${base}motion/covers/dumbbell-shoulder-press.webp`;
  }
  const covers: Record<string, string> = { a: 'bench-press', b: 'assisted-pullup', c: 'lever-squat', d: 'incline-dumbbell', e: 'preacher-curl', home: 'tuck-front-lever' };
  const cover = covers[workout];
  return cover && exerciseMotionId(plan, workout, cover, image)
    ? `${base}motion/covers/${cover}.webp`
    : `${base}exercise-${image}.webp`;
}

export function ExerciseMotion({ id, image, title, controls = false }: { id: string; image: number; title: string; controls?: boolean }) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(!document.hidden);
  const ref = useRef<HTMLDivElement>(null);
  const base = `${import.meta.env.BASE_URL}images/`;
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setFrame(0);
    Promise.all([1, 2].map(position => new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => img.decode().then(resolve, reject);
      img.onerror = reject;
      img.src = `${base}motion/${id}-${position}.webp`;
    }))).then(() => { if (!cancelled) setReady(true); }).catch(() => { /* Keep the original illustration if a frame is unavailable. */ });
    return () => { cancelled = true; };
  }, [base, id]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(ref.current!);
    const visibility = () => setForeground(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduceMotion = () => setPlaying(!preference.matches);
    preference.addEventListener('change', reduceMotion);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); preference.removeEventListener('change', reduceMotion); };
  }, []);
  useEffect(() => {
    if (!ready || !playing || !visible || !foreground) return;
    const timer = window.setInterval(() => setFrame(current => 1 - current), 1100);
    return () => window.clearInterval(timer);
  }, [ready, playing, visible, foreground]);

  return <div ref={ref} className={`exercise-motion ${controls ? 'motion-preview' : ''}`} data-motion={id} data-position={frame + 1}>
    <img className={controls ? undefined : 'exercise-image'} src={ready ? `${base}motion/${id}-${frame + 1}.webp` : `${base}exercise-${image}.webp`} alt={`Demonstração de ${title}`} />
    {controls && ready && <div className="motion-controls" role="group" aria-label="Demonstração do movimento">
      <button className="secondary" onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pausar movimento' : 'Reproduzir movimento'}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pausar' : 'Reproduzir'}</button>
      <div className="motion-positions">{[0, 1].map(position => <button key={position} aria-label={`Ver posição ${position + 1}`} aria-pressed={frame === position} onClick={() => { setPlaying(false); setFrame(position); }}>{position + 1}</button>)}</div>
    </div>}
  </div>;
}
