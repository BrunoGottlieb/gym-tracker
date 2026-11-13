import { useEffect, useId, useRef, useState } from 'react';
import { Check, CircleDashed, CloudOff, Coins, Pencil, RefreshCw, Sparkles, X } from 'lucide-react';
import { AvatarArt } from './AvatarArt';
import { avatarEquipment, avatarWallet, outfitCart, ownsEquipment, walletBalance, hairColors, hairstyles, skinTones, type AvatarConfig, type EquipmentSlot, type AvatarWallet } from './avatars';
import { avatarAsset, equipmentImage, equipmentViewBox } from './avatarImages';
import { LEVEL_XP, levelProgress } from './gamification';
import { planLabels } from './routinePlans';
import type { AppState } from './types';
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

function AvatarCustomizer({ member, wallet, onChange, onClose, initialSlot, sandbox }: { wallet: AvatarWallet; sandbox: boolean; member: TeamMember; onChange: (patch: Partial<AvatarConfig>) => boolean; onClose: () => void; initialSlot: EquipmentSlot | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<'hair' | 'colors' | 'equipment'>(initialSlot ? 'equipment' : 'hair');
  const [slot, setSlot] = useState<EquipmentSlot>(initialSlot ?? 'head');
  const [draft, setDraft] = useState<AvatarConfig>(() => ({ ...member.avatar }));
  const [error, setError] = useState('');
  const change = (patch: Partial<AvatarConfig>) => { setDraft(previous => ({ ...previous, ...patch })); setError(''); };
  const cart = sandbox ? [] : outfitCart(wallet, draft);
  const total = cart.reduce((sum, item) => sum + item.price, 0), balance = walletBalance(wallet);
  useEffect(() => {
    const node = dialog.current; if (!node || !member.current) return; node.showModal(); const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { if (node.open) node.close(); document.body.style.overflow = previous; };
  }, []);
  if (!member.current) return null;
  const save = () => { if (onChange(draft)) onClose(); else setError('O saldo mudou. Confira as moedas e tente novamente.'); };
  return <dialog className="avatar-editor avatar-shop" ref={dialog} aria-labelledby="avatar-editor-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="avatar-editor-heading"><div><h2 id="avatar-editor-title">Do seu jeito.</h2><p>Experimente tudo. Compre quando gostar.</p></div><span className="coin-balance" aria-label={`Saldo: ${balance} moedas`}><Coins size={16} /><b>{balance}</b></span><button className="icon-button" aria-label="Fechar personalização" onClick={onClose}><X size={21} /></button></div>
    <div className="customizer-preview"><AvatarArt avatar={draft} /><span><Sparkles size={13} />{sandbox ? 'Prévia local' : 'Provador livre'}</span></div>
    <div className="avatar-editor-tabs" role="group" aria-label="Personalização do avatar">{([['hair', 'Cabelo'], ['colors', 'Cores'], ['equipment', 'Equipamentos']] as const).map(([id, name]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{name}</button>)}</div>
    <div className="avatar-editor-content">
      {tab === 'hair' && <><div className="wardrobe-heading"><h3>Seu cabelo, sua escolha</h3><span>Todos grátis</span></div><div className="hairstyle-grid">{hairstyles.map(hair => <button key={hair.id} className={draft.hair === hair.id ? 'equipped' : ''} aria-pressed={draft.hair === hair.id} aria-label={`Cabelo ${hair.name}, grátis`} onClick={() => change({ hair: hair.id })}><AvatarArt avatar={{ ...draft, head: 'none', hair: hair.id }} portrait /><strong>{hair.name}</strong><small>Grátis</small>{draft.hair === hair.id && <Check size={13} className="avatar-selected-check" />}</button>)}</div></>}
      {tab === 'colors' && <><h3 className="palette-title">Cor do cabelo <span>Grátis</span></h3><div className="avatar-palette">{hairColors.map(color => <button key={color.id} style={{ '--swatch': color.color } as React.CSSProperties} className={draft.hairColor === color.id ? 'selected' : ''} aria-label={`Cabelo ${color.name}`} aria-pressed={draft.hairColor === color.id} onClick={() => change({ hairColor: color.id })}><i />{draft.hairColor === color.id && <Check size={15} />}<span>{color.name}</span></button>)}</div><h3 className="palette-title">Tom de pele <span>Grátis</span></h3><div className="avatar-palette">{skinTones.map(color => <button key={color.id} style={{ '--swatch': color.color } as React.CSSProperties} className={draft.skin === color.id ? 'selected' : ''} aria-label={color.name} aria-pressed={draft.skin === color.id} onClick={() => change({ skin: color.id })}><i />{draft.skin === color.id && <Check size={15} />}<span>{color.name.replace('Pele ', '')}</span></button>)}</div></>}
      {tab === 'equipment' && <><div className="wardrobe-slots" role="group" aria-label="Tipo de equipamento">{(Object.keys(slotNames) as EquipmentSlot[]).map(id => <button key={id} aria-pressed={slot === id} onClick={() => setSlot(id)}>{slotNames[id]}</button>)}</div><div className="equipment-grid">{[...avatarEquipment[slot]].sort((a, b) => a.price - b.price).map(item => {
        const owned = ownsEquipment(wallet, slot, item.id), selected = (draft[slot] ?? 'none') === item.id;
        return <button key={item.id} className={`${selected ? 'equipped' : ''} ${owned ? 'owned' : 'for-sale'}`} aria-label={item.name} aria-pressed={selected} onClick={() => change({ [slot]: item.id })}><EquipmentArt slot={slot} id={item.id} /><strong>{item.name}</strong><small>{item.price === 0 ? 'Grátis' : owned ? <><Check size={10} /> Seu</> : <><Coins size={11} /> {item.price}</>}</small>{selected && <Check size={13} className="avatar-selected-check" />}</button>;
      })}</div><p className="wardrobe-note">Monte o visual completo sem gastar. Apenas os itens selecionados entram na compra. Os seus podem ser usados sempre, sem pagar de novo.</p></>}
    </div>
    <footer className="avatar-editor-footer shop-footer">
      {!!cart.length && <div className="outfit-cart"><span>{cart.length} {cart.length === 1 ? 'item novo' : 'itens novos'}</span><div>{cart.map(item => <span key={item.key}>{item.name} <b>{item.price}</b></span>)}</div></div>}
      <div className="shop-checkout"><div className="shop-checkout-info">{sandbox ? <p>Teste local · sem gastar moedas</p> : total > 0 ? <><strong><Coins size={14} /> {total} moedas</strong><p>{total > balance ? `Faltam ${total - balance} moedas` : `Saldo após a compra: ${balance - total}`}</p></> : <p>Seu visual só muda ao salvar</p>}{error && <p role="alert">{error}</p>}</div><button className="primary" disabled={!sandbox && total > balance} onClick={save}>{sandbox ? 'Salvar prévia' : total > 0 ? 'Comprar e usar' : 'Salvar visual'}</button></div>
      <button className="text-button discard-outfit" onClick={onClose}>Cancelar</button>
    </footer>
  </dialog>;
}

export function AvatarProfile({ state, team, onChange, sandbox, sandboxAvailable, onSandbox, onResetSandbox }: { state: AppState; sandboxAvailable: boolean; team: TeamController; onChange: (patch: Partial<AvatarConfig>) => boolean; sandbox: boolean; onSandbox: (enabled: boolean) => void; onResetSandbox: () => void }) {
  const member = team.members.find(member => member.current)!;
  const [editing, setEditing] = useState<{ slot: EquipmentSlot | null } | null>(null);
  useEffect(() => { setEditing(null); }, [member.person]);
  const level = levelProgress(member.xp);
  const wallet = avatarWallet(state), balance = walletBalance(wallet);
  return <div className="profile-page" data-profile-person={member.person}><div className="page-heading"><div><span className="eyebrow">SEU ESPAÇO</span><h1>Perfil<span className="accent">.</span></h1><p className="subtitle">Seu ritmo. Seu estilo.</p></div></div>
    {sandboxAvailable && <section className="avatar-sandbox-control"><label className="toggle-row"><span><strong>Liberar equipamentos para teste</strong><small>Teste todos os itens sem gastar as moedas do sandbox. Desative para simular compras normalmente.</small></span><input type="checkbox" role="switch" aria-label="Modo sandbox neste aparelho" checked={sandbox} onChange={event => onSandbox(event.target.checked)} /></label>{sandbox && <div className="sandbox-status"><span><Sparkles size={13} />Todos os itens liberados para testar</span><button className="text-button" onClick={onResetSandbox}>Voltar ao meu avatar</button></div>}</section>}<div className="profile-showcase"><AvatarArt avatar={member.avatar} className="profile-miniature" /></div>
    <div className="profile-identity"><h2>{planLabels[member.person]}</h2><span className="avatar-level-badge">Nível {level.level}</span><span className="profile-you">Você</span></div>
    <div className="profile-xp"><div><span>{level.current} / {LEVEL_XP} XP</span><small>{member.xp.toLocaleString('pt-BR')} XP no total</small></div><div className="game-meter" role="progressbar" aria-label="Progresso do nível" aria-valuemin={0} aria-valuemax={LEVEL_XP} aria-valuenow={level.current}><span style={{ width: `${level.current / LEVEL_XP * 100}%` }} /></div></div>
    <section className="profile-equipment"><div className="avatar-section-heading"><h2>Equipamentos</h2><span className="coin-balance"><Coins size={14} /><b>{balance} moedas</b></span></div><div className="profile-equipment-slots no-next-reward">{(Object.keys(slotNames) as EquipmentSlot[]).map(slot => {
      const item = avatarEquipment[slot].find(item => item.id === (member.avatar[slot] ?? 'none'))!;
      return <button key={slot} onClick={() => setEditing({ slot })} aria-label={`Personalizar ${slotNames[slot]}, ${item.name}`}><strong>{slotNames[slot]}</strong><EquipmentArt slot={slot} id={item.id} /><small>{item.id === 'none' ? 'Escolher' : item.name}</small></button>;
    })}</div><button className="primary full-width" onClick={() => setEditing({ slot: null })}><Pencil size={17} />Personalizar avatar</button><p className="shop-earning-note">10 XP = 1 moeda ao finalizar um treino. O XP continua contando para o nível.</p></section>
    <AvatarTeam team={team} /><p className="team-backup-caption">Os avatares e níveis da equipe vêm do último backup de cada pessoa. Apenas o seu perfil pode ser personalizado.</p>
    {editing && <AvatarCustomizer key={member.person} member={member} wallet={wallet} onChange={onChange} onClose={() => setEditing(null)} initialSlot={editing.slot} sandbox={sandbox} />}
  </div>;
}
