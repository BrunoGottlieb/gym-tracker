import { memo } from 'react';
import type { AvatarConfig } from './avatars';
import { avatarAsset, avatarLayers } from './avatarImages';

export const AvatarArt = memo(function AvatarArt({ avatar, portrait = false, className = '' }: { avatar: AvatarConfig; portrait?: boolean; className?: string }) {
  const layers = avatarLayers(avatar);
  return <span className={`avatar-art ${portrait ? 'avatar-portrait' : ''} ${className}`} aria-hidden="true" data-avatar-renderer="images" data-avatar-hair={avatar.hair} data-avatar-head={avatar.head}>
    <span className="avatar-composition">{layers.map(layer => <img key={layer.id} className={layer.className} data-layer={layer.id} src={avatarAsset(layer.file)} alt="" draggable={false} />)}</span>
  </span>;
});
