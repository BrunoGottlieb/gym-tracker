import { useState } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import { canonicalExerciseId, getMuscle, muscleLabels } from './catalog';
import { exerciseLibrary, searchExercises, type ExercisePreset } from './exerciseLibrary';
import type { Exercise } from './types';

export function ExercisePicker({ exercises, replacing, onSelect, onClose, suggest = false }: {
  exercises: Exercise[]; replacing: number | null; onSelect: (preset: ExercisePreset) => void; onClose: () => void;
  suggest?: boolean;
}) {
  const [query, setQuery] = useState('');
  const results = searchExercises(query);
  const groups = [...new Set(exercises.map(getMuscle))].filter(group => group !== 'other');
  const includedIds = new Set(exercises.map(exercise => canonicalExerciseId(exercise.id)));
  const suggestions = suggest && !query.trim() ? groups.flatMap(group => {
    const candidate = exerciseLibrary.find(exercise => getMuscle(exercise) === group && !includedIds.has(exercise.id));
    return candidate ? [candidate] : [];
  }).slice(0, 4) : [];
  return <section className="exercise-picker" aria-label="Catálogo de exercícios">
    <div className="picker-heading"><div><h3>{replacing === null ? 'Adicionar exercício' : 'Substituir exercício'}</h3><p>Nome, ilustração e dados já preenchidos.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar catálogo"><X size={18} /></button></div>
    <label className="picker-search"><Search size={18} /><input autoFocus={!suggest} type="search" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} placeholder="Buscar nome ou grupo muscular…" aria-label="Buscar exercício" /></label>
    {suggestions.length > 0 && <div className="picker-suggestions"><h4>Sugestões para este treino</h4><p>Opções dos grupos musculares da sessão.</p><div>{suggestions.map(preset => <button className="secondary" type="button" key={preset.id} onClick={() => onSelect(preset)}><Plus size={14} /><span>{preset.name}<small>{muscleLabels[getMuscle(preset)]}</small></span></button>)}</div></div>}
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
