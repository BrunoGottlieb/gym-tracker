import type { BodyAssessment } from './assessments';

const fmt=(value:number)=>value.toLocaleString('pt-BR',{maximumFractionDigits:2});
export const reportScales = [
  {id:'fatPercent',classification:'fat',title:'Massa gorda',subtitle:'Percentual de gordura',unit:'%',bounds:[0,11,14,21,24,35],colors:['#18873c','#38a43c','#80a20c','#f5a000','#d44e16']},
  {id:'bmi',classification:'bmi',title:'IMC',subtitle:'Índice de Massa Corporal',unit:'',bounds:[12,17,18.5,25,30,35,40,45],colors:['#ed9800','#f5bb00','#18873c','#f5bb00','#ed9800','#d44e16','#8d2e0d']},
  {id:'bai',classification:'bai',title:'IAC',subtitle:'Índice de Adiposidade Corporal',unit:'%',bounds:[0,8,21,26,40],colors:['#ed9800','#18873c','#ed9800','#d44e16']},
  {id:'whr',classification:'whr',title:'RCQ',subtitle:'Relação Cintura × Quadril',unit:'',bounds:[0.7,0.83,0.89,0.95,1.1],colors:['#18873c','#f5bb00','#ed9800','#d44e16']},
] as const;

// Equal-width categories reproduce the report's bands; not a linear numeric axis.
export function reportPosition(value:number,bounds:readonly number[]) {
  if(value<=bounds[0])return 0;
  if(value>=bounds.at(-1)!)return 100;
  const segment=bounds.findIndex((end,i)=>i>0 && value<=end)-1;
  return (segment+(value-bounds[segment])/(bounds[segment+1]-bounds[segment]))/(bounds.length-1)*100;
}

export function AssessmentCharts({current,before}:{current:BodyAssessment;before?:BodyAssessment}) {
  const fat=current.values.fatPercent,lean=current.values.leanPercent;
  const hasComposition=fat!=null && lean!=null && fat>=0 && lean>=0 && fat+lean>0;
  return <section className="assessment-visuals" aria-label="Gráficos da avaliação">
    <div className="assessment-card composition-card"><div><h2>Composição corporal</h2><p className="subtle">{current.method||'Valores da avaliação'}</p><div className="composition-legend">{([['fatPercent','fatKg','Massa gorda','fat'],['leanPercent','leanKg','Massa magra','lean']] as const).map(([percent,mass,label,kind])=><div key={kind}><i className={kind}/><span><strong>{current.values[percent]==null?'—':`${fmt(current.values[percent]!)}%`} · {current.values[mass]==null?'—':`${fmt(current.values[mass]!)} kg`}</strong><small>{label}</small></span></div>)}</div></div>{hasComposition && <div className="composition-donut" role="img" aria-label={`Composição: ${fmt(fat)}% de massa gorda e ${fmt(lean)}% de massa magra`} style={{background:`conic-gradient(#ed8a36 0 ${fat/(fat+lean)*100}%, #39a779 ${fat/(fat+lean)*100}% 100%)`}}><div><strong>{current.values.weight==null?'—':fmt(current.values.weight)}</strong><span>kg</span></div></div>}</div>
    <div className="assessment-gauges">{reportScales.map(scale=>{
      const value=current.values[scale.id],previous=before?.values[scale.id];
      const classification=current.classifications[scale.classification];
      const position=value==null?0:reportPosition(value,scale.bounds);
      const end=value==null?-1:scale.bounds.findIndex((b,i)=>i>0&&value<b);
      const color=value==null?'#7885a0':scale.colors[end<0?scale.colors.length-1:Math.max(0,end-1)];
      return <article className="assessment-card report-gauge" key={scale.id} aria-label={`${scale.title}: ${value==null?'não informado':fmt(value)+scale.unit}. ${classification}`}>
        <div className="gauge-heading"><div><h2>{scale.title}</h2><p>{scale.subtitle}</p></div>{classification && <span className="gauge-classification"><i style={{background:color}}/>{classification}</span>}</div>
        {value!=null && value>0 ? <><div className="gauge-value"><strong>{fmt(value)}{scale.unit}</strong>{before && previous!=null && <small>Comparação: {fmt(previous)}{scale.unit}</small>}</div><div className="gauge-track" role="img" aria-label={`Faixas de ${scale.title}, valor ${fmt(value)}${scale.unit}. Limites do relatório: ${scale.bounds.slice(1,-1).map(fmt).join(', ')}.`}>{scale.colors.map((c,i)=><span key={i} style={{background:c}}/>)}<i className="gauge-pointer" style={{left:`${position}%`}}/>{previous!=null && previous>0 && <i className="gauge-previous" title={`Comparação: ${fmt(previous)}${scale.unit}`} style={{left:`${reportPosition(previous,scale.bounds)}%`}}/>}</div><div className="gauge-ticks">{scale.bounds.slice(1,-1).map((v,i)=><span key={v} style={{left:`${(i+1)/scale.colors.length*100}%`}}>{fmt(v)}</span>)}</div></> : <p className="subtle">Valor não informado.</p>}
      </article>;
    })}</div><p className="subtle gauge-explanation">Cores, limites e classificações seguem os relatórios enviados. As faixas têm larguras iguais; a escala não é linear. Marcador escuro: avaliação selecionada. Contorno azul: comparação.</p>
  </section>;
}
