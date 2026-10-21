import { BicepsFlexed, Dumbbell } from 'lucide-react';
import type { ReactNode } from 'react';
import { muscleLabels } from './catalog';
import type { MuscleGroup } from './types';

function TorsoOutline() {
  return <path d="M18 5v5l-8 3-5 12 5 2 4-9-1 11 3 14h16l3-14-1-11 4 9 5-2-5-12-8-3V5" fill="currentColor" fillOpacity=".07" stroke="currentColor" strokeWidth="2.1" />;
}

function AnatomyIcon({ muscle, size, children }: { muscle: MuscleGroup; size: number; children: ReactNode }) {
  return <svg className="muscle-anatomy" data-anatomy={muscle} width={size} height={size} viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;
}

export function MuscleIcon({ muscle, size = 18 }: { muscle: MuscleGroup; size?: number }) {
  if (muscle === 'chest') return <AnatomyIcon muscle={muscle} size={size}><TorsoOutline /><g fill="currentColor" stroke="currentColor" strokeWidth="1.2"><path d="M23 14c-3-2-6-2-9 0l-1 9c3 3 7 3 10 0z" /><path d="M25 14c3-2 6-2 9 0l1 9c-3 3-7 3-10 0z" /></g><path d="M24 14v13m-8 4 5 1m6 0 5-1m-14 6h12" stroke="currentColor" strokeWidth="1.4" opacity=".45" /></AnatomyIcon>;
  if (muscle === 'back') return <AnatomyIcon muscle={muscle} size={size}><TorsoOutline /><g fill="currentColor"><path d="m18 10-5 4 8 6 2-7zm12 0 5 4-8 6-2-7z" /><path d="m13 17 10 6v13l-7-8zm22 0-10 6v13l7-8z" /></g><path d="M24 11v29m-7-2 5 3m9-3-5 3" stroke="currentColor" strokeWidth="1.8" /></AnatomyIcon>;
  if (muscle === 'legs') return <AnatomyIcon muscle={muscle} size={size}><path d="M11 4c8 2 18 2 26 0l-1 17-4 23h-7l-1-17-1 17h-7l-4-23z" fill="currentColor" fillOpacity=".07" stroke="currentColor" strokeWidth="2.1" /><g fill="currentColor"><path d="m14 10 8 1-1 12-5-1zm20 0-8 1 1 12 5-1zM16 27h5l-1 13h-2zm11 0h5l-2 13h-2z" /></g><path d="M24 8v11m-8 6h5m6 0h5" stroke="currentColor" strokeWidth="1.7" /></AnatomyIcon>;
  if (muscle === 'shoulders') return <AnatomyIcon muscle={muscle} size={size}><circle cx="24" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M20 12v2l-8 2-5 10v12l5 1 3-14 1 19h16l1-19 3 14 5-1V26l-5-10-8-2v-2" fill="currentColor" fillOpacity=".07" stroke="currentColor" strokeWidth="2.1" /><g fill="currentColor"><path d="M16 15c-7 0-10 6-10 11l7 2c-1-5 1-9 6-11z" /><path d="M32 15c7 0 10 6 10 11l-7 2c1-5-1-9-6-11z" /></g><path d="m18 21 6 2 6-2m-6 3v12" stroke="currentColor" strokeWidth="1.4" opacity=".5" /></AnatomyIcon>;
  if (muscle === 'abs') return <AnatomyIcon muscle={muscle} size={size}><TorsoOutline /><g fill="currentColor"><rect x="17" y="20" width="6" height="6" rx="2" /><rect x="25" y="20" width="6" height="6" rx="2" /><rect x="18" y="28" width="5" height="5" rx="1.7" /><rect x="25" y="28" width="5" height="5" rx="1.7" /><rect x="19" y="35" width="4" height="5" rx="1.5" /><rect x="25" y="35" width="4" height="5" rx="1.5" /></g></AnatomyIcon>;
  const Icon = muscle === 'other' ? Dumbbell : BicepsFlexed;
  return <Icon size={size} aria-hidden="true" />;
}
export function MuscleBadge({ muscle }: { muscle: MuscleGroup }) {
  return <span className={`muscle-badge muscle-${muscle}`} aria-label={`Grupo muscular principal: ${muscleLabels[muscle]}`}><MuscleIcon muscle={muscle} size={17} />{muscleLabels[muscle]}</span>;
}
