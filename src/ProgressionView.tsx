import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, CalendarDays, ChevronDown, ChevronRight, History, TrendingUp, Trophy } from 'lucide-react';
import type { AppState } from './types';
import { currentLoad, exerciseEntries, loadPoints, type LoadPoint } from './progression';
import { MuscleBadge } from './components';

const kg = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
const shortDate = (at: number) => new Date(at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

function LoadChart({ points }: { points: LoadPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  useEffect(() => { const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width))); if (ref.current) observer.observe(ref.current); return () => observer.disconnect(); }, []);
  const height = 230, left = 52, right = width - 18, top = 24, bottom = 185;
  const maxWeight = Math.max(...points.map(p => p.weight)), minWeight = Math.min(...points.map(p => p.weight));
  const padding = Math.max(2.5, (maxWeight - minWeight) * .2);
  const low = Math.max(0, minWeight - padding), high = maxWeight + padding;
  const first = points[0].at, last = points.at(-1)!.at;
  const x = (at: number) => first === last ? (left + right) / 2 : left + (at - first) / (last - first) * (right - left);
  const y = (weight: number) => bottom - (weight - low) / (high - low) * (bottom - top);
  const ticks = first === last ? [first] : [first, ...(width > 390 ? [first + (last - first) / 2] : []), last];
  const [selected, setSelected] = useState<string | null>(null);
  const point = points.find(p => p.sessionId === selected);
  return <div className="load-chart" ref={ref}>
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Evolução da carga em ${points.length} sessões: de ${kg(points[0].weight)} para ${kg(points.at(-1)!.weight)}.`}>
      <text x={left} y={12} className="chart-axis-title">Carga (kg)</text>
      {[0, .5, 1].map(fraction => { const weight = low + fraction * (high - low); const yy = y(weight); return <g key={fraction}><line x1={left} x2={right} y1={yy} y2={yy} className="chart-grid" /><text x={left - 9} y={yy + 4} textAnchor="end" className="chart-label">{weight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</text></g>; })}
      {points.length > 1 && <polyline className="chart-line" points={points.map(p => `${x(p.at)},${y(p.weight)}`).join(' ')} />}
      {points.map(p => <g key={p.sessionId}><circle cx={x(p.at)} cy={y(p.weight)} r={selected === p.sessionId ? 6 : 4} className="chart-point" /><circle className="chart-hit" cx={x(p.at)} cy={y(p.weight)} r={18} onClick={() => setSelected(p.sessionId)}><title>{new Date(p.at).toLocaleString('pt-BR')} · {kg(p.weight)} · {p.completed}/{p.total} séries</title></circle></g>)}
      {ticks.map((at, i) => <text key={i} x={x(at)} y={bottom + 20} textAnchor={i === 0 && ticks.length > 1 ? 'start' : i === ticks.length - 1 && ticks.length > 1 ? 'end' : 'middle'} className="chart-label">{shortDate(at)}</text>)}
      <text x={right} y={height - 5} textAnchor="end" className="chart-axis-title">Data do treino</text>
    </svg>
    {point && <p className="chart-selected" role="status">{new Date(point.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · <strong>{kg(point.weight)}</strong> · {point.completed}/{point.total} séries</p>}
  </div>;
}

export function Progression({ state, exerciseId, onSelect, onPreview, onOpenSession }: { state: AppState; exerciseId: string; onSelect: (id: string) => void; onPreview: (image: number, title: string, exerciseId: string) => void; onOpenSession: (sessionId: string) => void }) {
  const entries = exerciseEntries(state);
  const selected = entries.find(e => e.id === exerciseId) ?? entries[0];
  const points = loadPoints(state, selected.id);
  const current = currentLoad(state, selected.id);
  const previous = points.at(-1);
  const best = points.length ? Math.max(...points.map(p => p.weight)) : null;
  const change = points.length >= 2 ? points.at(-1)!.weight - points[0].weight : null;
  return <>
    <div className="page-heading"><div><span className="eyebrow">CADA PASSO FICA REGISTRADO</span><h1>Sua evolução<span className="accent">.</span></h1><p className="subtitle">A carga de hoje e o caminho que te trouxe até aqui.</p></div><span className="heading-decoration"><TrendingUp size={36} strokeWidth={1.5} /></span></div>
    <label className="progress-selector form-field" htmlFor="progress-exercise">Escolha um exercício<select id="progress-exercise" value={selected.id} onChange={e => onSelect(e.target.value)}>{entries.map(e => <option key={e.id} value={e.id}>{e.name}{e.archived ? ' (anterior)' : ''}</option>)}</select></label>
    <div className="progress-exercise-heading"><button className="progress-image-button" onClick={() => onPreview(selected.image, selected.name, selected.id)} aria-label={`Ampliar imagem de ${selected.name}`}><img src={`${import.meta.env.BASE_URL}images/exercise-${selected.image}.webp`} alt={selected.name} /></button><div><h2>{selected.name}</h2><MuscleBadge muscle={selected.muscle} />{selected.archived && <p className="subtle">Exercício anterior, mantido no histórico.</p>}</div></div>
    <div className="load-summary">
      <div><span><BookOpen size={15} />Carga atual</span><strong>{kg(current)}</strong><small>{selected.archived ? 'Última carga guardada' : 'Preenchida no próximo treino'}</small></div>
      <div><span><History size={15} />Último treino</span><strong>{previous ? kg(previous.weight) : '—'}</strong><small>{previous ? shortDate(previous.at) : 'Sem sessão registrada'}</small></div>
      <div><span><Trophy size={15} />Maior registrada</span><strong>{best !== null ? kg(best) : '—'}</strong><small>{points.length} {points.length === 1 ? 'sessão registrada' : 'sessões registradas'}</small></div>
    </div>
    <section className="progress-chart-section"><div className="section-heading"><h2>Histórico de cargas</h2>{change !== null && <span className="load-delta"><ArrowUpRight size={14} />{change > 0 ? '+' : ''}{kg(change)} desde o primeiro registro</span>}</div>{points.length ? <><LoadChart key={selected.id} points={points} /><p className="subtle">Cargas de treinos finalizados com ao menos uma série concluída. As repetições exibidas são as metas do treino.</p></> : <div className="progress-empty"><TrendingUp size={32} /><h3>O próximo treino começa essa história.</h3><p>Sua carga atual já fica salva. Finalize treinos com séries concluídas para ver a evolução aqui.</p></div>}</section>
    {!!points.length && <section className="progress-sessions"><h2>Registros desse exercício</h2>{[...points].reverse().map(point => <button className="progress-session" key={point.sessionId} onClick={() => onOpenSession(point.sessionId)}><CalendarDays size={18} /><span><strong>{new Date(point.at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong><small>{point.completed}/{point.total} séries concluídas · {new Date(point.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></span><b>{kg(point.weight)}</b><ChevronRight size={17} /></button>)}</section>}
    <details className="current-load-library"><summary><span><strong>Suas cargas atuais</strong><small>Ver todos os exercícios</small></span><ChevronDown size={18} /></summary>{entries.filter(e => !e.archived).map(e => <button key={e.id} className={`current-load-row ${selected.id === e.id ? 'selected' : ''}`} onClick={() => { onSelect(e.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span><strong>{e.name}</strong><small>{state.weights[e.id] === undefined ? 'Ainda sem carga informada' : 'Última carga guardada'}</small></span><b>{kg(currentLoad(state, e.id))}</b><ChevronRight size={16} /></button>)}</details>
  </>;
}
