import { memo, useId } from 'react';
import type { AvatarConfig } from './avatars';
import { avatarAsset, avatarLayers, type AvatarLayer } from './avatarImages';

function ForegroundHeadgear({ layer }: { layer: AvatarLayer }) {
  const id = `headgear-${useId().replace(/:/g, '')}`;
  // Crown underside and far headphone cup sit behind the head. The near cup
  // and headband can pass over the hair, matching the three-quarter portrait.
  return <svg className={layer.className} data-layer={layer.id} viewBox="0 0 1254 1254" aria-hidden="true">
    <defs>{layer.mask === 'crown-front' ? <clipPath id={id}><path d="M0 0H1254V354H786Q625 310 464 354H0Z" /></clipPath> : <>
      <linearGradient id={`${id}-recede`} gradientUnits="userSpaceOnUse" x1="640" y1="0" x2="755" y2="0"><stop stopColor="white" /><stop offset="1" stopColor="black" /></linearGradient>
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254"><rect x="350" y="110" width="510" height="225" fill={`url(#${id}-recede)`} /><rect x="350" y="320" width="185" height="205" rx="12" fill="white" /></mask>
    </>}</defs>
    <image href={avatarAsset(layer.file)} width="1254" height="1254" {...(layer.mask === 'crown-front' ? { clipPath: `url(#${id})` } : { mask: `url(#${id})` })} />
  </svg>;
}

function SleevedBase({ layer }: { layer: AvatarLayer }) {
  const id = `sleeved-base-${useId().replace(/:/g, '')}`;
  return <svg className={layer.className} data-layer={layer.id} viewBox="0 0 1254 1254" aria-hidden="true">
    <defs>
      <filter id={`${id}-skin`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  20 0 -20 0 0" /><feComponentTransfer><feFuncA type="discrete" tableValues="0 1" /></feComponentTransfer></filter>
      <clipPath id={`${id}-wrists`}><rect x="330" y="750" width="580" height="90" /></clipPath>
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254"><rect width="1254" height="1254" fill="white" /><rect x="330" y="525" width="580" height="225" fill="black" /><image href={avatarAsset(layer.file)} width="1254" height="1254" filter={`url(#${id}-skin)`} clipPath={`url(#${id}-wrists)`} /><rect x="535" y="525" width="180" height="55" fill="white" /><ellipse cx="490" cy="742" rx="21" ry="29" fill="white" /><ellipse cx="789" cy="742" rx="21" ry="29" fill="white" /></mask>
    </defs>
    <image href={avatarAsset(layer.file)} width="1254" height="1254" mask={`url(#${id})`} />
  </svg>;
}

function ForegroundHead({ layer }: { layer: AvatarLayer }) {
  const id = `head-skin-${useId().replace(/:/g, '')}`;
  // Reuse the exact selected skin's head, above collars but below hair/accessories.
  // The alpha of the base image preserves the original face and ear contour.
  return <svg className={layer.className} data-layer={layer.id} viewBox="0 0 1254 1254" aria-hidden="true">
    <defs><clipPath id={id}><rect x="385" y="140" width="450" height="385" /></clipPath></defs>
    <image href={avatarAsset(layer.file)} width="1254" height="1254" clipPath={`url(#${id})`} />
  </svg>;
}

function ForegroundHands({ file, sleeves }: { file: string; sleeves: boolean }) {
  const id = useId().replace(/:/g, '');
  const top = sleeves ? 750 : 718;
  // Reuse each skin's unchanged base pixels. A native SVG color mask excludes
  // blue fabric/shorts, so only hands are composited over the garment.
  return <svg className="avatar-hands-layer" data-layer="hands" viewBox="0 0 1254 1254" aria-hidden="true">
    <defs><filter id={`${id}-skin`} colorInterpolationFilters="sRGB" x="0" y="0" width="1254" height="1254" filterUnits="userSpaceOnUse">
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  20 0 -20 0 0" />
      <feComponentTransfer><feFuncA type="discrete" tableValues="0 1" /></feComponentTransfer><feComposite operator="in" in2="SourceAlpha" />
    </filter><mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254"><image href={avatarAsset(file)} width="1254" height="1254" filter={`url(#${id}-skin)`} /></mask>
    <clipPath id={`${id}-clip`}>{sleeves ? <><path d="M420 770Q438 761 447 746L462 725Q473 713 480 722L479 740Q501 736 523 755L550 780V840H420Z" /><path d="M764 775L765 737Q778 718 790 737L792 750Q817 750 845 775L860 800V840H764Z" /></> : <><rect x="422" y={top} width="128" height={832 - top} /><rect x="765" y={top} width="92" height={832 - top} /></>}</clipPath></defs>
    <image href={avatarAsset(file)} width="1254" height="1254" mask={`url(#${id}-mask)`} clipPath={`url(#${id}-clip)`} />
  </svg>;
}

export const AvatarArt = memo(function AvatarArt({ avatar, portrait = false, waistUp = false, className = '' }: { avatar: AvatarConfig; portrait?: boolean; waistUp?: boolean; className?: string }) {
  const layers = avatarLayers(avatar);
  return <span className={`avatar-art ${portrait ? 'avatar-portrait' : ''} ${waistUp ? 'avatar-waist-up' : ''} ${['top-hat', 'crown', 'bunny-ears', 'cowboy-hat'].includes(avatar.head) ? 'has-tall-head' : ''} ${className}`} aria-hidden="true" data-avatar-renderer="images" data-avatar-hair={avatar.hair} data-avatar-head={avatar.head}>
    <span className="avatar-composition">{layers.map(layer => layer.id === 'base' && ['hoodie', 'leather-jacket'].includes(avatar.shirt) ? <SleevedBase key={layer.id} layer={layer} /> : layer.mask === 'head-skin' ? <ForegroundHead key={layer.id} layer={layer} /> : layer.mask === 'hands' ? !portrait && <ForegroundHands key={layer.id} file={layer.file} sleeves={['hoodie', 'leather-jacket'].includes(avatar.shirt)} /> : layer.mask ? <ForegroundHeadgear key={layer.id} layer={layer} /> : <img key={layer.id} className={layer.className} data-layer={layer.id} src={avatarAsset(layer.file)} alt="" draggable={false} />)}</span>
  </span>;
});
