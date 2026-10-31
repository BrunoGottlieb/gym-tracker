import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { database } from './storage';
import { STREAK_GROUP_KEY } from './streakConfig';
import { completionEvents, eventSignature, isSnapshot, type CloudSnapshot, type CompletionEvent } from './streaks';
import type { AppState } from './types';

export const STREAK_API = 'https://gym-tracker-streaks-brunogottlieb.darthgottlieb.chatgpt.site/api/streaks';
interface SyncSettings { code: string; cache: CloudSnapshot | null; acknowledgements: Record<string, string>; profileSignature: string; lastSync: number | null }
const blank = (): SyncSettings => ({ code: STREAK_GROUP_KEY, cache: null, acknowledgements: {}, profileSignature: '', lastSync: null });
function savedSettings(value: unknown): SyncSettings {
  if (!value || typeof value !== 'object') return blank();
  const data = value as SyncSettings;
  if (data.code !== STREAK_GROUP_KEY || (data.cache !== null && !isSnapshot(data.cache)) || !data.acknowledgements || typeof data.acknowledgements !== 'object' || !Object.values(data.acknowledgements).every(value => typeof value === 'string') || typeof data.profileSignature !== 'string' || (data.lastSync !== null && (typeof data.lastSync !== 'number' || !Number.isFinite(data.lastSync)))) return blank();
  return data;
}
export type CloudStatus = 'loading' | 'disconnected' | 'syncing' | 'synced' | 'offline' | 'error';

export function useCloudStreaks(state: AppState | null) {
  const [settings, setSettings] = useState<SyncSettings>(blank);
  const [status, setStatus] = useState<CloudStatus>('loading');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef(state); stateRef.current = state;
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const busy = useRef(false);
  const generation = useRef(0);
  const persistQueue = useRef(Promise.resolve());
  const persist = useCallback(async (next: SyncSettings) => {
    settingsRef.current = next; setSettings(next);
    const write = persistQueue.current.catch(() => {}).then(() => database.sync.put({ id: 'streak-room', value: next })).then(() => {});
    persistQueue.current = write;
    await write;
  }, []);
  useEffect(() => { let alive = true; database.sync.get('streak-room').then(record => {
    if (!alive) return; const next = savedSettings(record?.value); settingsRef.current = next; setSettings(next); setStatus(next.code ? 'offline' : 'disconnected'); setLoaded(true);
  }).catch(() => { if (alive) { setError('Não foi possível abrir a configuração de sincronização.'); setStatus('error'); setLoaded(true); } }); return () => { alive = false; generation.current++; }; }, []);

  const synchronize = useCallback(async () => {
    if (busy.current || !stateRef.current || !settingsRef.current.code) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    busy.current = true;
    const run = generation.current, code = settingsRef.current.code;
    setStatus('syncing'); setError('');
    const request = async (method: 'GET' | 'POST', body?: unknown) => {
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(STREAK_API, { method, headers: { Authorization: `Bearer ${code}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store', credentials: 'omit', signal: controller.signal });
        if (response.status === 401 || response.status === 403) throw new Error('O serviço de sequências está indisponível. Seus treinos continuam salvos no aparelho.');
        if (!response.ok) throw new Error('A nuvem está indisponível. Seus treinos continuam salvos no aparelho.');
        return response.json();
      } finally { clearTimeout(timeout); }
    };
    try {
      // Authenticate before sending any completion records.
      const initial = await request('GET');
      if (!isSnapshot(initial)) throw new Error('A nuvem retornou dados inválidos. Tente sincronizar novamente.');
      const current = stateRef.current!;
      let next = { ...settingsRef.current, acknowledgements: { ...settingsRef.current.acknowledgements } };
      if (run !== generation.current || next.code !== code) return;
      const events = completionEvents(current);
      const pending = events.filter(event => next.acknowledgements[event.id] !== eventSignature(event));
      const person = current.selectedPlan ?? 'original';
      const trainingDays = [...new Set(current.workouts.map(workout => workout.day))].sort();
      const profileSignature = `${person}|${trainingDays.join(',')}`;
      for (let offset = 0; offset < Math.max(1, pending.length); offset += 30) {
        const batch = pending.slice(offset, offset + 30);
        const profile = offset === 0 && next.profileSignature !== profileSignature ? { person, trainingDays } : undefined;
        if (!batch.length && !profile) break;
        const result = await request('POST', { events: batch, ...(profile ? { profile } : {}) });
        if (!result?.ok || !Array.isArray(result.accepted) || batch.some(event => !result.accepted.includes(event.id))) throw new Error('Não foi possível confirmar o envio. Os registros serão tentados novamente.');
        if (run !== generation.current || settingsRef.current.code !== code) return;
        for (const event of batch) next.acknowledgements[event.id] = eventSignature(event);
        if (profile) next.profileSignature = profileSignature;
        await persist(next);
      }
      const cache = await request('GET');
      if (!isSnapshot(cache)) throw new Error('A nuvem retornou dados inválidos.');
      if (run !== generation.current || settingsRef.current.code !== code) return;
      next = { ...next, cache, lastSync: Date.now() };
      await persist(next); setStatus('synced');
    } catch (failure) {
      if (run === generation.current) { setError(failure instanceof Error ? failure.message : 'Não foi possível sincronizar.'); setStatus(navigator.onLine ? 'error' : 'offline'); }
    } finally { busy.current = false; }
  }, [persist]);
  useEffect(() => { if (!loaded || !settings.code || !state) return; const timer = setTimeout(() => { void synchronize(); }, 350); return () => clearTimeout(timer); }, [loaded, settings.code, state?.history, state?.workouts, state?.selectedPlan, synchronize]);
  useEffect(() => {
    const refresh = () => { if (!document.hidden) void synchronize(); };
    const offline = () => { if (settingsRef.current.code) setStatus('offline'); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('online', refresh); window.addEventListener('offline', offline); document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('online', refresh); window.removeEventListener('offline', offline); document.removeEventListener('visibilitychange', refresh); };
  }, [synchronize]);
  const localEvents = useMemo(() => state ? completionEvents(state) : [], [state?.history]);
  const pending = localEvents.filter(event => settings.acknowledgements[event.id] !== eventSignature(event)).length;
  return { enabled: !!settings.code, code: settings.code, snapshot: settings.cache, lastSync: settings.lastSync, status, error, pending, localEvents: localEvents as CompletionEvent[], synchronize };
}
export type CloudStreakController = ReturnType<typeof useCloudStreaks>;
