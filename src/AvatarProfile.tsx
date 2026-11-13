import { useEffect, useId, useRef, useState } from 'react';
import { Check, CircleDashed, CloudOff, LockKeyhole, Pencil, RefreshCw, Sparkles, X } from 'lucide-react';
import { AvatarArt } from './AvatarArt';
import { MAX_AVATAR_LEVEL, avatarEquipment, hairColors, hairstyles, skinTones, type AvatarConfig, type EquipmentSlot } from './avatars';
import { avatarAsset, equipmentImage, equipmentViewBox } from './avatarImages';
import { LEVEL_XP, levelProgress } from './gamification';
import { planLabels } from './routinePlans';
import type { TeamController, TeamMember } from './useTeamProfiles';
import './avatar.css';

export function EquipmentArt({ slot, id }: { slot: EquipmentSlot; id: string }) {
  const image = equipmentImage(slot, id);
  const filterId = `avatar-blue-${useId().replace(/:/g, '')}`;
  const blue = slot === 'shirt' && id === 'blue';
  return image ? <><svg width="0" height="0" className="avatar-color-defs" aria-hidden="true"><defs><filter id={filterId} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".064 .2145 .02166 0 0 .09567 .32184 .03249 0 0 .23386 .78672 .07942 0 0 0 0 0 1 0" /></filter></defs></svg><svg className={`equipment-art equipment-image ${image.className}`} viewBox={equipmentViewBox(image.file)} style={blue ? { filter: `url(#${filterId})` } : undefined} aria-hidden="true"><image href={avatarAsset(image.file)} width="1254" height="1254" /></svg></> : <span className="equipment-art equipment-empty" aria-hidden="true"><CircleDashed size={26} /></span>;
}

export function AvatarTeam({ team, onOpenProfile, compact = false }: { team: TeamController; onOpenProfile?: () => void; compact?: boolean }) {
  return <section className={`avatar-team ${compact ? 'compact-team' : ''}`} aria-label="Sua equipe"><div className="avatar-section-heading"><div><h2>Sua equipe</h2>{!compact && <p>Uma série de cada vez. Juntos.</p>}</div><button className="icon-button" onClick={team.refresh} disabled={team.loading} aria-label="Atualizar níveis da equipe"><RefreshCw size={16} className={team.loading ? 'spin' : ''} /></button></div><div className="avatar-team-list" role="list">{team.members.map(member => {
    const label = `${planLabels[member.person]}, ${member.known ? `nível ${levelProgress(member.xp).level}` : 'nível ainda não sincronizado'}`;
    const content = <><span className={`team-portrait portrait-${member.person}`}><AvatarArt avatar={member.avatar} waistUp /></span><strong>{planLabels[member.person]}</strong><span className="avatar-level-badge">{member.known ? `Nível ${levelProgress(member.xp).level}` : 'Nível —'}</span></>;
    return <div key={member.person} role="listitem">{member.current && onOpenProfile ? <button className="team-person selected" data-person={member.person} onClick={onOpenProfile} aria-label={`Abrir meu perfil: ${label}`}>{content}</button> : <article className={`team-person ${member.current ? 'selected' : ''}`} data-person={member.person} data-readonly="true" aria-label={label}>{content}</article>}</div>;
  })}</div>{team.offline && <p className="team-sync-note"><CloudOff size={12} />Exibindo os últimos dados disponíveis.</p>}</section>;
}

const slotNames = { head: 'Cabeça', face: 'Rosto', facialHair: 'Bigode', shirt: 'Roupa', extra: 'Extra' };

function AvatarCustomizer({ member, onChange, onClose, initialSlot, sandbox }: { sandbox: boolean; member: TeamMember; onChange: (patch: Partial<AvatarConfig>) => void; onClose: () => void; initialSlot: EquipmentSlot | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<'hair' | 'colors' | 'equipment'>(initialSlot ? 'equipment' : 'hair');
  const [slot, setSlot] = useState<EquipmentSlot>(initialSlot ?? 'head');
  const level = sandbox ? MAX_AVATAR_LEVEL : levelProgress(member.xp).level;
  useEffect(() => {
    const node = dialog.current; if (!node || !member.current) return; node.showModal(); const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { if (node.open) node.close(); document.body.style.overflow = previous; };
  }, []);
  if (!member.current) return null;
  return <dialog className="avatar-editor" ref={dialog} aria-labelledby="avatar-editor-title" onCancel={event => { event.preventDefault(); onClose(); }}><div className="avatar-editor-heading"><div><h2 id="avatar-editor-title">Do seu jeito.</h2><p>{planLabels[member.person]} <span>· {sandbox ? 'Sandbox' : ('Nível ' + level)}</span></p></div><button className="icon-button" aria-label="Fechar personalização" onClick={onClose}><X size={21} /></button></div><div className="customizer-preview"><AvatarArt avatar={member.avatar} /><span><Sparkles size={13} />Esse é o seu estilo</span></div><div className="avatar-editor-tabs" role="group" aria-label="Personalização do avatar">{([['hair', 'Cabelo'], ['colors', 'Cores'], ['equipment', 'Equipamentos']] as const).map(([id, name]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{name}</button>)}</div><div className="avatar-editor-content">
    {tab === 'hair' && <><div className="wardrobe-heading"><h3>Seu cabelo, sua escolha</h3><span>Todos grátis</span></div><div className="hairstyle-grid">{hairstyles.map(hair => <button key={hair.id} className={member.avatar.hair === hair.id ? 'equipped' : ''} aria-pressed={member.avatar.hair === hair.id} aria-label={`Cabelo ${hair.name}, grátis`} onClick={() => onChange({ hair: hair.id })}><AvatarArt avatar={{ ...member.avatar, head: 'none', hair: hair.id }} portrait /><strong>{hair.name}</strong><small>Grátis</small>{member.avatar.hair === hair.id && <Check size={13} className="avatar-selected-check" />}</button>)}</div></>}
    {tab === 'colors' && <><h3 className="palette-title">Cor do cabelo <span>Grátis</span></h3><div className="avatar-palette">{hairColors.map(color => <button key={color.id} style={{ '--swatch': color.color } as React.CSSProperties} className={member.avatar.hairColor === color.id ? 'selected' : ''} aria-label={`Cabelo ${color.name}`} aria-pressed={member.avatar.hairColor === color.id} onClick={() => onChange({ hairColor: color.id })}><i />{member.avatar.hairColor === color.id && <Check size={15} />}<span>{color.name}</span></button>)}</div><h3 className="palette-title">Tom de pele <span>Grátis</span></h3><div className="avatar-palette">{skinTones.map(color => <button key={color.id} style={{ '--swatch': color.color } as React.CSSProperties} className={member.avatar.skin === color.id ? 'selected' : ''} aria-label={color.name} aria-pressed={member.avatar.skin === color.id} onClick={() => onChange({ skin: color.id })}><i />{member.avatar.skin === color.id && <Check size={15} />}<span>{color.name.replace('Pele ', '')}</span></button>)}</div></>}
    {tab === 'equipment' && <><div className="wardrobe-slots" role="group" aria-label="Tipo de equipamento">{(Object.keys(slotNames) as EquipmentSlot[]).map(id => <button key={id} aria-pressed={slot === id} onClick={() => setSlot(id)}>{slotNames[id]}</button>)}</div><div className="equipment-grid">{[...avatarEquipment[slot]].sort((a, b) => a.level - b.level).map(item => {
      const locked = item.level > level, equipped = (member.avatar[slot] ?? 'none') === item.id;
      return <button key={item.id} className={`${equipped ? 'equipped' : ''} ${locked ? 'locked' : ''}`} disabled={locked} aria-label={`${item.name}${locked ? `, desbloqueia no nível ${item.level}` : ''}`} aria-pressed={equipped} onClick={() => onChange({ [slot]: item.id })}><EquipmentArt slot={slot} id={item.id} /><strong>{item.name}</strong><small>{locked ? <><LockKeyhole size={10} /> Nível {item.level}</> : equipped ? <><Check size={10} /> Equipado</> : item.level === 1 ? 'Grátis' : 'Equipar'}</small>{equipped && <Check size={13} className="avatar-selected-check" />}</button>;
    })}</div><p className="wardrobe-note">Combine cabeça, rosto, bigode, roupa e extra. Cabelos e cores são gratuitos; os itens são liberados por nível.</p></>}
    </div><footer className="avatar-editor-footer"><p><Check size={12} />{sandbox ? 'Prévia salva só neste aparelho' : 'Escolhas salvas automaticamente'}</p><button className="primary" onClick={onClose}>Concluído</button></footer></dialog>;
}

export function AvatarProfile({ team, onChange, sandbox, sandboxAvailable, onSandbox, onResetSandbox }: { sandboxAvailable: boolean; team: TeamController; onChange: (patch: Partial<AvatarConfig>) => void; sandbox: boolean; onSandbox: (enabled: boolean) => void; onResetSandbox: () => void }) {
  const member = team.members.find(member => member.current)!;
  const [editing, setEditing] = useState<{ slot: EquipmentSlot | null } | null>(null);
  useEffect(() => { setEditing(null); }, [member.person]);
  const level = levelProgress(member.xp);
  const nextReward = sandbox ? undefined : Object.entries(avatarEquipment).flatMap(([slot, items]) => items.map(item => ({ ...item, slot: slot as EquipmentSlot }))).filter(item => item.level > level.level).sort((a, b) => a.level - b.level)[0];
  return <div className="profile-page" data-profile-person={member.person}><div className="page-heading"><div><span className="eyebrow">SEU ESPAÇO</span><h1>Perfil<span className="accent">.</span></h1><p className="subtitle">Seu ritmo. Seu estilo.</p></div></div>
    {sandboxAvailable && <section className="avatar-sandbox-control"><label className="toggle-row"><span><strong>Modo sandbox</strong><small>Experimente todos os itens só neste aparelho. Seu XP e avatar salvos não mudam.</small></span><input type="checkbox" role="switch" aria-label="Modo sandbox neste aparelho" checked={sandbox} onChange={event => onSandbox(event.target.checked)} /></label>{sandbox && <div className="sandbox-status"><span><Sparkles size={13} />Todos os itens liberados para testar</span><button className="text-button" onClick={onResetSandbox}>Voltar ao meu avatar</button></div>}</section>}<div className="profile-showcase"><AvatarArt avatar={member.avatar} className="profile-miniature" /></div>
    <div className="profile-identity"><h2>{planLabels[member.person]}</h2><span className="avatar-level-badge">Nível {level.level}</span><span className="profile-you">Você</span></div>
    <div className="profile-xp"><div><span>{level.current} / {LEVEL_XP} XP</span><small>{member.xp.toLocaleString('pt-BR')} XP no total</small></div><div className="game-meter" role="progressbar" aria-label="Progresso do nível" aria-valuemin={0} aria-valuemax={LEVEL_XP} aria-valuenow={level.current}><span style={{ width: `${level.current / LEVEL_XP * 100}%` }} /></div></div>
    <section className="profile-equipment"><div className="avatar-section-heading"><h2>Equipamentos</h2><span>Desbloqueados por nível</span></div><div className={`profile-equipment-slots ${nextReward ? '' : 'no-next-reward'}`}>{(Object.keys(slotNames) as EquipmentSlot[]).map(slot => {
      const item = avatarEquipment[slot].find(item => item.id === (member.avatar[slot] ?? 'none'))!;
      return <button key={slot} onClick={() => setEditing({ slot })} aria-label={`Personalizar ${slotNames[slot]}, ${item.name}`}><strong>{slotNames[slot]}</strong><EquipmentArt slot={slot} id={item.id} /><small>{item.id === 'none' ? 'Escolher' : item.name}</small></button>;
    })}{nextReward && <div className="next-avatar-reward"><LockKeyhole size={13} /><EquipmentArt slot={nextReward.slot} id={nextReward.id} /><span>Nível {nextReward.level}</span><small>{nextReward.name}</small></div>}</div><button className="primary full-width" onClick={() => setEditing({ slot: null })}><Pencil size={17} />Personalizar avatar</button></section>
    <AvatarTeam team={team} /><p className="team-backup-caption">Os avatares e níveis da equipe vêm do último backup de cada pessoa. Apenas o seu perfil pode ser personalizado.</p>
    {editing && <AvatarCustomizer key={member.person} member={member} onChange={onChange} onClose={() => setEditing(null)} initialSlot={editing.slot} sandbox={sandbox} />}
  </div>;
}
