import { useId } from 'react';
import { avatarEquipment, hairColors, skinTones, type AvatarConfig } from './avatars';

// A matching, customizable illustration for devices without a 3D context.
export function AvatarFallback({ avatar, portrait }: { avatar: AvatarConfig; portrait: boolean }) {
  const id = useId().replace(/:/g, '');
  const skin = skinTones.find(item => item.id === avatar.skin)!.color;
  const hair = hairColors.find(item => item.id === avatar.hairColor)!.color;
  const shirt = avatarEquipment.shirt.find(item => item.id === avatar.shirt)!.color;
  const head = avatarEquipment.head.find(item => item.id === avatar.head)!.color;
  const extra = avatarEquipment.extra.find(item => item.id === avatar.extra)!.color;
  const long = ['long', 'bob', 'ponytail'].includes(avatar.hair);
  return <svg viewBox={portrait ? '15 5 90 90' : '0 0 120 170'} fill="none" data-fallback-hair={avatar.hair}>
    <defs>{[['skin', skin], ['hair', hair], ['shirt', shirt], ['head', head]].map(([name, color]) => <radialGradient key={name} id={`${name}-${id}`} cx=".3" cy=".2" r=".9"><stop stopColor={color} /><stop offset="1" stopColor={color} /><stop offset="1" stopColor="#000" stopOpacity=".15" /></radialGradient>)}</defs>
    <ellipse cx="60" cy="161" rx="31" ry="5" fill="#91A4D5" opacity=".15" />
    {long && <rect x="26" y="18" width="68" height={avatar.hair === 'long' ? 85 : 67} rx="33" fill={hair} />}
    <path d="M43 130V154M77 130V154" stroke={skin} strokeWidth="14" strokeLinecap="round" /><path d="M39 156H51M70 156H83" stroke="#FDFEFF" strokeWidth="14" strokeLinecap="round" />
    <path d="M44 119V138M75 119V138" stroke="#344774" strokeWidth="22" /><path d="M39 94L26 114L41 123M81 94L94 114L79 123" stroke={skin} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="37" y="85" width="46" height="44" rx="18" fill={`url(#shirt-${id})`} />
    <ellipse cx="27" cy="51" rx="7" ry="9" fill={skin} /><ellipse cx="93" cy="51" rx="7" ry="9" fill={skin} /><ellipse cx="60" cy="47" rx="34" ry="36" fill={`url(#skin-${id})`} />
    {avatar.hair !== 'bald' && <path d="M27 39Q22 10 49 10Q81 0 93 33L85 36Q75 22 57 25Q39 29 27 39Z" fill={`url(#hair-${id})`} />}
    {['curly', 'afro', 'wavy', 'short'].includes(avatar.hair) && <g fill={hair}>{[32, 44, 57, 71, 84].map((x, i) => <circle key={x} cx={x} cy={21 - Math.sin(i / 4 * Math.PI) * (avatar.hair === 'afro' ? 10 : 4)} r={avatar.hair === 'afro' ? 13 : avatar.hair === 'curly' ? 10 : 9} />)}</g>}
    {avatar.hair === 'quiff' && <ellipse cx="57" cy="15" rx="26" ry="12" transform="rotate(-16 57 15)" fill={hair} />}
    {avatar.hair === 'bun' && <circle cx="62" cy="10" r="12" fill={hair} />}
    {avatar.hair === 'ponytail' && <ellipse cx="91" cy="48" rx="10" ry="28" fill={hair} />}
    <ellipse cx="48" cy="48" rx="2.7" ry="4" fill="#362B32" /><ellipse cx="72" cy="48" rx="2.7" ry="4" fill="#362B32" /><path d="M53 64Q60 69 67 64" stroke="#754D40" strokeWidth="2" strokeLinecap="round" /><ellipse cx="60" cy="58" rx="4" ry="2.7" fill={skin} />
    {['headband', 'visor'].includes(avatar.head) && <><path d="M27 32Q60 24 93 31L92 39Q60 32 28 40Z" fill={head} />{avatar.head === 'visor' && <ellipse cx="67" cy="37" rx="31" ry="5" fill={head} />}</>}
    {avatar.head === 'cap' && <><path d="M25 30Q24 3 60 3Q94 4 95 32Z" fill={head} /><ellipse cx="69" cy="34" rx="34" ry="5" fill={head} /></>}
    {avatar.head === 'headphones' && <><path d="M23 49V36Q23 3 60 3Q97 3 97 36V49" stroke={head} strokeWidth="6" /><rect x="18" y="40" width="12" height="23" rx="6" fill={head} /><rect x="90" y="40" width="12" height="23" rx="6" fill={head} /></>}
    {avatar.extra !== 'none' && <path d="M32 119L38 123M82 123L88 119" stroke={extra} strokeWidth="9" strokeLinecap="round" />}
  </svg>;
}
