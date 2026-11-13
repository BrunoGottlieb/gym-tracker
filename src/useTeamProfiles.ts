import { APP_SANDBOX, cloudFetch } from './appSandbox';
import { useCallback, useEffect, useRef, useState } from 'react';
import { database } from './storage';
import { parseBackup } from './domain';
import { profileAvatar, validTeamProfile, type TeamProfile } from './avatars';
import { personalXP } from './gamification';
import { STREAK_GROUP_KEY } from './streakConfig';
import type { AppState, RoutinePlan } from './types';
import { mergeSharedAvatars, useSharedAvatars } from './useSharedAvatars';

const people: RoutinePlan[] = ['original', 'sheet', 'ivan'];
// Previous cache entries contain lifetime XP, before Bruno/Nick's fresh start.
const teamCacheKey = 'avatar-team-xp-fresh-start-v1';
export interface TeamMember extends TeamProfile { known: boolean; current: boolean }
export function profileFromBackup(payload: string, person: RoutinePlan, updatedAt?: string): TeamProfile {
  const state = parseBackup(payload);
  if ((state.selectedPlan ?? 'original') !== person) throw Error('Perfil diferente do solicitado.');
  const xp = personalXP(state.history, person);
  return { person, xp, avatar: profileAvatar(state, person), updatedAt };
}
export function teamMembers(state: AppState, remote: TeamProfile[]): TeamMember[] {
  const current = state.selectedPlan ?? 'original';
  return people.map(person => {
    const cloud = remote.find(profile => profile.person === person);
    const local = { person, xp: personalXP(state.history, person), avatar: profileAvatar(state, person) };
    const fromLocal = person === current || !cloud;
    return { ...(fromLocal ? local : cloud), current: person === current, known: person === current || !!cloud || state.history.some(s => (s.person ?? 'original') === person) };
  });
}

export function useTeamProfiles(state: AppState | null) {
  const shared = useSharedAvatars(state);
  const [profiles, setProfiles] = useState<TeamProfile[]>([]);
  const [cacheReady, setCacheReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const stateRef = useRef(state); stateRef.current = state;
  const busy = useRef(false), lastFetch = useRef(0);
  const person = state ? state.selectedPlan ?? 'original' : null;
  const refresh = useCallback(async (force = false) => {
    if (APP_SANDBOX || !stateRef.current || busy.current || (!force && Date.now() - lastFetch.current < 60000)) return;
    if (!navigator.onLine) { setOffline(true); return; }
    busy.current = true; lastFetch.current = Date.now(); setLoading(true);
    const selected = stateRef.current.selectedPlan ?? 'original';
    const responses = await Promise.allSettled(people.filter(p => p !== selected).map(async person => {
      const response = await cloudFetch(`https://gym-tracker-streaks-brunogottlieb.darthgottlieb.chatgpt.site/api/backups?person=${person}`, {
        headers: { Authorization: `Bearer ${STREAK_GROUP_KEY}` }, cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw Error('Perfil indisponível.');
      const data = await response.json();
      if (data.revision === null) return { person, profile: null };
      return { person, profile: profileFromBackup(data.payload, person, data.updatedAt) };
    }));
    const successful = responses.flatMap(response => response.status === 'fulfilled' ? [response.value] : []);
    setProfiles(previous => {
      const next = previous.filter(profile => !successful.some(result => result.person === profile.person));
      next.push(...successful.flatMap(result => result.profile ? [result.profile] : []));
      return next;
    });
    setOffline(responses.some(response => response.status === 'rejected')); setLoading(false); busy.current = false;
    if (stateRef.current && (stateRef.current.selectedPlan ?? 'original') !== selected) void refresh(true);
  }, []);
  useEffect(() => {
    let alive = true;
    void database.sync.get(teamCacheKey).then(record => {
      if (alive && Array.isArray(record?.value)) setProfiles(record.value.filter(validTeamProfile));
    }).catch(() => {}).finally(() => { if (alive) setCacheReady(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (cacheReady) void database.sync.put({ id: teamCacheKey, value: profiles }).catch(() => {}); }, [profiles, cacheReady]);
  useEffect(() => { if (person && cacheReady) { lastFetch.current = 0; void refresh(true); } }, [person, cacheReady, refresh]);
  useEffect(() => {
    const update = () => { if (!document.hidden) void refresh(); };
    const reconnect = () => { void refresh(true); };
    window.addEventListener('online', reconnect); document.addEventListener('visibilitychange', update);
    const timer = setInterval(update, 60000);
    return () => { clearInterval(timer); window.removeEventListener('online', reconnect); document.removeEventListener('visibilitychange', update); };
  }, [refresh]);
  return { members: state ? teamMembers(state, mergeSharedAvatars(profiles, shared.profiles)) : [], avatarStatus: shared.status, loading, offline, refresh: () => { void refresh(true); shared.refresh(); } };
}
export type TeamController = ReturnType<typeof useTeamProfiles>;
