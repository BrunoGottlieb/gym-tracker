import { useState } from 'react';
import { Check, CircleDashed, RotateCcw, Sparkles } from 'lucide-react';
import { LEVEL_XP, levelProgress } from './gamification';
import './layered-avatar-preview.css';

const asset = (name: string) => `${import.meta.env.BASE_URL}avatars/layered-v1/${name}.png`;

export function LayeredAvatarPreview({ name, xp }: { name: string; xp: number }) {
  const [hair, setHair] = useState<'wavy' | 'side-part'>('wavy');
  const [shirt, setShirt] = useState<'blue' | 'mint'>('blue');
  const [visor, setVisor] = useState(true);
  const level = levelProgress(xp);
  const description = `${name}, avatar ilustrado com cabelo ${hair === 'wavy' ? 'ondulado' : 'de lado'}, regata ${shirt === 'blue' ? 'azul' : 'menta'}${visor ? ' e viseira menta' : ', sem acessório'}`;

  function reset() { setHair('wavy'); setShirt('blue'); setVisor(true); }

  return <section className="layered-avatar-preview" aria-label="Prévia do avatar em imagens">
    <div className="layered-avatar-stage">
      <span className="layered-preview-badge"><Sparkles size={12} />Prévia</span>
      <div className="layered-avatar-character" role="img" aria-label={description}>
        <img className="layered-avatar-base" src={asset('base')} alt="" draggable={false} />
        {shirt === 'mint' && <img className="layered-avatar-shirt" src={asset('shirt-mint')} alt="" draggable={false} />}
        <img key={hair} className={`layered-avatar-hair hair-${hair}`} src={asset(`hair-${hair}`)} alt="" draggable={false} />
        {visor && <img className="layered-avatar-visor" src={asset('visor')} alt="" draggable={false} />}
      </div>
    </div>
    <div className="profile-identity"><h2>{name}</h2><span className="avatar-level-badge">Nível {level.level}</span><span className="profile-you">Você</span></div>
    <div className="profile-xp"><div><span>{level.current} / {LEVEL_XP} XP</span><small>{xp.toLocaleString('pt-BR')} XP no total</small></div><div className="game-meter" role="progressbar" aria-label="Progresso do nível" aria-valuemin={0} aria-valuemax={LEVEL_XP} aria-valuenow={level.current}><span style={{ width: `${level.current / LEVEL_XP * 100}%` }} /></div></div>

    <section className="layered-preview-wardrobe"><div className="avatar-section-heading"><h2>Experimente o visual</h2><button className="icon-button" aria-label="Restaurar a prévia" onClick={reset}><RotateCcw size={15} /></button></div>
      <div className="layered-preview-group" role="group" aria-label="Cabelo da prévia"><h3>Cabelo <small>Grátis</small></h3><div className="layered-preview-options">{([['wavy', 'Ondulado'], ['side-part', 'De lado']] as const).map(([id, label]) => <button key={id} aria-pressed={hair === id} onClick={() => setHair(id)}><span className="layered-option-art hair-sample" style={{ backgroundImage: `url(${asset(`hair-${id}`)})` }} /><span>{label}</span>{hair === id && <Check size={13} className="layered-option-check" />}</button>)}</div></div>
      <div className="layered-preview-group" role="group" aria-label="Regata da prévia"><h3>Regata</h3><div className="layered-preview-options">{([['blue', 'Azul'], ['mint', 'Menta']] as const).map(([id, label]) => <button key={id} aria-pressed={shirt === id} onClick={() => setShirt(id)}><span className={`layered-option-art shirt-sample ${id === 'blue' ? 'blue-shirt-sample' : ''}`} style={{ backgroundImage: `url(${asset('shirt-mint')})` }} /><span>{label}</span>{shirt === id && <Check size={13} className="layered-option-check" />}</button>)}</div></div>
      <div className="layered-preview-group" role="group" aria-label="Acessório da prévia"><h3>Acessório</h3><div className="layered-preview-options"><button aria-pressed={!visor} onClick={() => setVisor(false)}><span className="layered-option-art no-accessory"><CircleDashed size={26} /></span><span>Sem acessório</span>{!visor && <Check size={13} className="layered-option-check" />}</button><button aria-pressed={visor} onClick={() => setVisor(true)}><span className="layered-option-art visor-sample" style={{ backgroundImage: `url(${asset('visor')})` }} /><span>Viseira menta</span>{visor && <Check size={13} className="layered-option-check" />}</button></div></div>
      <p className="layered-preview-note">Amostra para experimentar o novo visual. Seu avatar salvo continua em “Avatar atual”.</p>
    </section>
  </section>;
}
