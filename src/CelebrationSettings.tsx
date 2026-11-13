import { CircleCheck, Flame, Play } from 'lucide-react';
import { MinimalBonfire } from './MinimalBonfire';
import { celebrationThemes, defaultCelebrationTheme, type CelebrationTheme } from './celebrationThemes';

export function CelebrationSettings({ theme = defaultCelebrationTheme, onChange, onPreview }: {
  theme?: CelebrationTheme;
  onChange: (theme: CelebrationTheme) => void;
  onPreview: () => void;
}) {
  return <section className="settings-section celebration-settings">
    <h2><Flame size={19} />Animação da chama</h2>
    <div className="celebration-theme-grid" role="group" aria-label="Estilo da animação">
      {celebrationThemes.map(option => <button key={option.id} type="button" className={`celebration-theme-option ${theme === option.id ? 'selected' : ''}`} aria-pressed={theme === option.id} onClick={() => onChange(option.id)}>
        <span className="celebration-theme-thumbnail" aria-hidden="true">
          {option.id === 'realistic' ? <img src={`${import.meta.env.BASE_URL}images/bonfire/sanctuary.webp`} alt="" loading="lazy" />
            : option.id === 'classic' ? <Flame /> : <MinimalBonfire compact knight={option.id === 'knight'} />}
        </span>
        <strong>{option.name}{theme === option.id && <CircleCheck size={16} />}</strong>
        <small>{option.description}</small>
      </button>)}
    </div>
    <button className="secondary" onClick={onPreview}><Play size={15} />Ver animação escolhida</button>
  </section>;
}
