import { memo, useEffect, useState } from 'react';
import type { AvatarConfig } from './avatars';
import { AvatarFallback } from './AvatarFallback';

export const AvatarArt = memo(function AvatarArt({ avatar, portrait = false, angle = -.12, className = '' }: { avatar: AvatarConfig; portrait?: boolean; angle?: number; className?: string }) {
  const [image, setImage] = useState('');
  const signature = JSON.stringify(avatar);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => { void import('./avatarScene').then(module => {
      if (!alive) return;
      const next = module.renderAvatar(JSON.parse(signature), portrait, angle); if (alive) setImage(next);
    }).catch(() => { /* The lightweight fallback remains available without WebGL. */ }); }, 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [signature, portrait, angle]);
  return <span className={`avatar-art ${portrait ? 'avatar-portrait' : ''} ${className}`} aria-hidden="true" data-rendered={!!image}>
    {image ? <img src={image} alt="" draggable={false} /> : <AvatarFallback avatar={avatar} portrait={portrait} />}
  </span>;
});
