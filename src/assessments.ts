import type { RoutinePlan } from './types';

export const assessmentGroups = [
  { title: 'Composição corporal', unit: '', fields: [['weight','Peso','kg'],['fatPercent','Massa gorda','%'],['fatKg','Massa gorda','kg'],['leanPercent','Massa magra','%'],['leanKg','Massa magra','kg'],['bmi','IMC',''],['bai','IAC','%'],['whr','RCQ','']] },
  { title: 'Membros superiores', unit: 'cm', fields: [['armRelaxedLeft','Braço relaxado · esquerdo'],['armRelaxedRight','Braço relaxado · direito'],['armFlexedLeft','Braço contraído · esquerdo'],['armFlexedRight','Braço contraído · direito'],['forearmLeft','Antebraço · esquerdo'],['forearmRight','Antebraço · direito']] },
  { title: 'Membros inferiores', unit: 'cm', fields: [['thighLeft','Coxa · esquerda'],['thighRight','Coxa · direita'],['calfLeft','Panturrilha · esquerda'],['calfRight','Panturrilha · direita']] },
  { title: 'Tronco e outros', unit: 'cm', fields: [['chestRelaxed','Tórax relaxado'],['chestInspired','Tórax inspirado'],['waist','Cintura'],['abdomen','Abdome'],['hip','Quadril'],['neck','Pescoço'],['shoulder','Ombro']] },
  { title: 'Dobras cutâneas', unit: 'mm', fields: [['subscapular','Subescapular'],['triceps','Tríceps'],['biceps','Bíceps'],['thorax','Tórax'],['midaxillary','Axilar média'],['suprailiac','Supra ilíaca'],['abdominal','Abdominal'],['medialThigh','Coxa medial'],['medialCalf','Panturrilha medial']] },
] as const;
export const assessmentFields = assessmentGroups.flatMap(g => g.fields.map(f => ({ id: f[0], label: f[1], unit: (f as readonly string[])[2] ?? g.unit, group: g.title })));
export interface BodyAssessment {
  id: string; person: RoutinePlan; date: string; validUntil: string; title: string;
  location: string; evaluator: string; age: number | null; method: string;
  values: Record<string, number | null>;
  classifications: { fat: string; bmi: string; bai: string; whr: string };
  references: string; notes: string;
}
export const firstBrunoAssessment: BodyAssessment = {
  id:'bruno-assessment-2026-07-02',person:'original',date:'2026-07-02',validUntil:'2026-09-30',title:'Avaliação #1',location:'Licorsul',evaluator:'Douglas de Biasi',age:28,method:'Faulkner (1968) — 4 dobras',
  values:{weight:68.8,fatPercent:15.8,fatKg:10.9,leanPercent:84.2,leanKg:57.9,bmi:21.2,bai:19,whr:0.86,armRelaxedLeft:27,armRelaxedRight:26,armFlexedLeft:31,armFlexedRight:30,forearmLeft:0,forearmRight:0,thighLeft:49,thighRight:49,calfLeft:34,calfRight:34,chestRelaxed:93,chestInspired:95,waist:78,abdomen:84,hip:91,neck:0,shoulder:0,subscapular:16,triceps:9.5,biceps:0,thorax:0,midaxillary:0,suprailiac:11,abdominal:29,medialThigh:0,medialCalf:0},
  classifications:{fat:'Dentro da Média',bmi:'Peso Normal',bai:'Peso Normal',whr:'Risco Moderado'},
  references:'Limites exibidos no relatório: massa gorda 11 / 14 / 21 / 24%; IMC 17 / 18,5 / 25 / 30 / 35 / 40; IAC 8 / 21 / 26%; RCQ 0,83 / 0,89 / 0,95.',
  notes:'Transcrita das três imagens da primeira avaliação. Os valores 0 constam assim no relatório; não confirmam ausência de tecido ou medida corporal.',
};
export function validAssessment(value: unknown): value is BodyAssessment {
  if (!value || typeof value !== 'object') return false;
  const a = value as BodyAssessment;
  const date = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s+'T12:00:00Z')) && new Date(s+'T12:00:00Z').toISOString().slice(0,10) === s;
  return ['original','sheet','ivan'].includes(a.person) && date(a.date) && (a.validUntil === '' || date(a.validUntil)) && ['id','title','location','evaluator','method','references','notes'].every(k => typeof a[k as keyof BodyAssessment] === 'string' && String(a[k as keyof BodyAssessment]).length <= 4000) && !!a.id && (a.age === null || Number.isInteger(a.age) && a.age >= 0 && a.age <= 120) && !!a.values && typeof a.values === 'object' && !Array.isArray(a.values) && Object.entries(a.values).every(([k,v]) => assessmentFields.some(f=>f.id===k) && (v===null || typeof v==='number' && Number.isFinite(v) && v>=0 && v<=10000)) && !!a.classifications && ['fat','bmi','bai','whr'].every(k=>typeof a.classifications[k as keyof typeof a.classifications]==='string' && a.classifications[k as keyof typeof a.classifications].length<=200);
}
export function assessmentDelta(before: number | null | undefined, after: number | null | undefined) {
  return before == null || after == null || before === 0 || after === 0 ? null : Math.round((after-before)*100)/100;
}
