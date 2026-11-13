import { useCallback, useEffect, useRef, useState } from 'react';
import { APP_SANDBOX, cloudFetch } from './appSandbox';
import { profileAvatar, validTeamProfile, type AvatarConfig, type TeamProfile } from './avatars';
import { personalXP } from './gamification';
import { database } from './storage';
import { STREAK_GROUP_KEY } from './streakConfig';
import type { AppState, RoutinePlan } from './types';

const api = 'https://gym-tracker-streaks-brunogottlieb.darthgottlieb.chatgpt.site/api/avatars';
const cacheKey = 'shared-avatars-v1';
const appearanceKey = (a: AvatarConfig) => [a.hair, a.hairColor, a.skin, a.head, a.shirt, a.extra, a.face ?? 'none', a.facialHair ?? 'none'].join('|');
export interface SharedAvatar extends TeamProfile { changedAt: number }
export function validSharedAvatar(value: unknown): value is SharedAvatar {
  return validTeamProfile(value) && typeof (value as SharedAvatar).changedAt === 'number' && Number.isSafeInteger((value as SharedAvatar).changedAt) && (value as SharedAvatar).changedAt >= 0;
}
export function sharedAvatarPayload(state: AppState) {
  const person = state.selectedPlan ?? 'original';
  // Never publish a fresh installation's implicit default over an existing look.
  if (!state.avatars?.[person]) return null;
  return { person, avatar: profileAvatar(state, person), xp: personalXP(state.history, person), changedAt: state.avatarChangedAt?.[person] ?? 0 };
}
export function mergeSharedAvatars(backups: TeamProfile[], direct: SharedAvatar[]): TeamProfile[] {
  const merged = new Map(backups.map(profile => [profile.person, profile]));
  for (const profile of direct) {
    const backup = merged.get(profile.person);
    // A delayed whole-backup upload may contain an older appearance even with
    // a newer server timestamp. The dedicated channel owns the shared look.
    const newerBackup = backup?.updatedAt && profile.updatedAt && Date.parse(backup.updatedAt) > Date.parse(profile.updatedAt);
    merged.set(profile.person, { ...profile, xp: newerBackup ? backup.xp : profile.xp });
  }
  return [...merged.values()];
}
function mergeSnapshots(previous: SharedAvatar[], incoming: SharedAvatar[]) {
  const profiles = new Map(previous.map(profile => [profile.person, profile]));
  for (const profile of incoming) {
    const old = profiles.get(profile.person);
    if (!old || profile.changedAt > old.changedAt || profile.changedAt === old.changedAt && Date.parse(profile.updatedAt ?? '') >= Date.parse(old.updatedAt ?? '')) profiles.set(profile.person, profile);
  }
  return [...profiles.values()];
}
export type AvatarSyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error' | 'stale' | 'sandbox';
export function useSharedAvatars(state: AppState | null) {
  const [profiles, setProfiles] = useState<SharedAvatar[]>([]);
  const [status, setStatus] = useState<AvatarSyncStatus>(APP_SANDBOX ? 'sandbox' : 'local');
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state); stateRef.current = state;
  const fetching = useRef(false), uploading = useRef(false), uploadAgain = useRef(false);
  const receipts = useRef<Partial<Record<RoutinePlan, string>>>({});
  const remoteProfiles = useRef<SharedAvatar[] | null>(null);
  const publishRef = useRef<() => void>(() => {});
  const payload = state ? sharedAvatarPayload(state) : null, signature = JSON.stringify(payload);
  const person = state?.selectedPlan ?? 'original', hasState = !!state;
  useEffect(() => {
    let alive = true;
    void database.sync.get(cacheKey).then(row => { if (alive && Array.isArray(row?.value)) setProfiles(row.value.filter(validSharedAvatar)); }).catch(() => {}).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (ready) void database.sync.put({ id: cacheKey, value: profiles }).catch(() => {}); }, [profiles, ready]);
  const refresh = useCallback(async () => {
    if (APP_SANDBOX || fetching.current || !navigator.onLine) return;
    fetching.current = true;
    try {
      const response = await cloudFetch(api, { headers: { Authorization: `Bearer ${STREAK_GROUP_KEY}` }, cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('Avatar unavailable');
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.profiles) || !data.profiles.every(validSharedAvatar)) throw Error('Invalid avatar response');
      remoteProfiles.current = data.profiles;
      setProfiles(previous => mergeSnapshots(previous, data.profiles));
      publishRef.current();
    } catch { /* Keep last known teammates, even when backup or avatar API is down. */ }
    finally { fetching.current = false; }
  }, []);
  const publish = useCallback(async () => {
    if (APP_SANDBOX) return;
    if (uploading.current) { uploadAgain.current = true; return; }
    const copy = stateRef.current ? sharedAvatarPayload(stateRef.current) : null;
    if (!copy) { setStatus('local'); return; }
    if (!navigator.onLine) { setStatus('offline'); return; }
    const signature = JSON.stringify(copy), receiptKey = `shared-avatar-published-${copy.person}`;
    uploading.current = true;
    try {
      const receipt = receipts.current[copy.person] ?? (await database.sync.get(receiptKey))?.value;
      const remote = remoteProfiles.current?.find(profile => profile.person === copy.person);
      const confirmed = remoteProfiles.current === null || !!remote && remote.changedAt === copy.changedAt && appearanceKey(remote.avatar) === appearanceKey(copy.avatar) && remote.xp === copy.xp;
      if (receipt === signature && confirmed) { if ((stateRef.current?.selectedPlan ?? 'original') === copy.person) setStatus('synced'); return; }
      setStatus('syncing');
      const response = await cloudFetch(api, { method: 'POST', headers: { Authorization: `Bearer ${STREAK_GROUP_KEY}`, 'Content-Type': 'application/json' }, body: signature, cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('Avatar not saved');
      const data = await response.json();
      if (data.ok !== true || typeof data.accepted !== 'boolean' || !validSharedAvatar(data.profile) || data.profile.person !== copy.person) throw Error('Invalid avatar confirmation');
      if (remoteProfiles.current) remoteProfiles.current = [...remoteProfiles.current.filter(profile => profile.person !== copy.person), data.profile];
      setProfiles(previous => mergeSnapshots(previous, [data.profile]));
      // A rejected legacy edit must not be automatically retried over a newer
      // explicit change. Saving a new outfit generates a fresh timestamp.
      if (data.accepted) {
        receipts.current[copy.person] = signature;
        await database.sync.put({ id: receiptKey, value: signature });
      }
      if ((stateRef.current?.selectedPlan ?? 'original') === copy.person) setStatus(data.accepted ? 'synced' : 'stale');
    } catch { setStatus(navigator.onLine ? 'error' : 'offline'); }
    finally { uploading.current = false; if (uploadAgain.current) { uploadAgain.current = false; void publish(); } }
  }, []);
  publishRef.current = () => { void publish(); };
  useEffect(() => {
    if (!ready || !state) return;
    const timer = setTimeout(() => { void publish(); }, 600);
    return () => clearTimeout(timer);
  }, [signature, ready, person, publish]);
  useEffect(() => {
    if (!ready || !state || APP_SANDBOX) return;
    void refresh();
    const update = () => { if (!document.hidden) { void refresh(); void publish(); } };
    window.addEventListener('online', update); document.addEventListener('visibilitychange', update);
    const timer = setInterval(update, 15000);
    return () => { clearInterval(timer); window.removeEventListener('online', update); document.removeEventListener('visibilitychange', update); };
  }, [ready, hasState, person, refresh, publish]);
  return { profiles, status, refresh: () => { void refresh(); void publish(); } };
}
