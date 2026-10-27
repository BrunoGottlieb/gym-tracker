import { useState } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import { canonicalExerciseId, muscleLabels } from './catalog';
import { searchExercises, type ExercisePreset } from './exerciseLibrary';
import type { Exercise } from './types';

export function ExercisePicker({ exercises, replacing, onSelect, onClose }: {
  exercises: Exercise[]; replacing: number | null; onSelect: (preset: ExercisePreset) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const results = searchExercises(query);
  return <section className="exercise-picker" aria-label="Catálogo de exercícios">
    <div className="picker-heading"><div><h3>{replacing === null ? 'Adicionar exercício' : 'Substituir exercício'}</h3><p>Nome, ilustração e dados já preenchidos.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar catálogo"><X size={18} /></button></div>
    <label className="picker-search"><Search size={18} /><input autoFocus type="search" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} placeholder="Buscar nome ou grupo muscular…" aria-label="Buscar exercício" /></label>
    <p className="picker-count">{results.length} {results.length === 1 ? 'exercício' : 'exercícios'} · A–Z</p>
    <div className="picker-results">
      {results.map(preset => {
        const included = exercises.some((exercise, index) => index !== replacing && canonicalExerciseId(exercise.id) === preset.id);
        return <button type="button" className="picker-option" key={preset.id} disabled={included} onClick={() => onSelect(preset)} aria-label={`${included ? 'Já no treino' : 'Selecionar'}: ${preset.name}`}>
          <img src={`${import.meta.env.BASE_URL}images/exercise-${preset.image}.webp`} alt="" loading="lazy" />
          <span><strong>{preset.name}</strong><small>{muscleLabels[preset.muscle ?? 'other']} · {preset.sets} séries · {preset.target} {preset.kind === 'seconds' ? 's' : 'rep.'}</small>{included && <small className="picker-included">Já no treino</small>}</span>
          {included ? <Check size={18} /> : <Plus size={18} />}
        </button>;
      })}
      {!results.length && <p className="picker-empty">Nenhum exercício encontrado. Tente outro nome ou crie um personalizado.</p>}
    </div>
    <p className="picker-hint">Metas e descanso são sugestões editáveis. As cargas registradas continuam vinculadas a cada exercício.</p>
  </section>;
}
