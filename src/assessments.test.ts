import { describe,it,expect } from 'vitest';
import { assessmentFields,firstBrunoAssessment,secondBrunoAssessment,assessmentDelta,validAssessment } from './assessments';
import { createInitialState } from './data';
import { createBackup,parseBackup,validateState } from './domain';
import { reportPosition, reportScales } from './AssessmentCharts';
import { migrateState } from './migrations';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyAssessments } from './BodyAssessments';
import { profileBackup,restoreProfile,canReplaceEmptyCloudSeed } from './CloudBackup';
describe('body assessments',()=>{
 it.each(['sheet','ivan'] as const)('does not display or export Bruno assessments in %s',person=>{
  const s=createInitialState();s.selectedPlan=person;
  const html=renderToStaticMarkup(createElement(BodyAssessments,{state:s,onChange:()=>{}}));
  expect(html).toContain('Tua primeira referência');
  expect(html).not.toContain('Douglas de Biasi');
  expect(html).not.toContain('70,6');
  expect(html).not.toContain('report-gauge');
  expect(JSON.parse(profileBackup(s)).data.assessments).toEqual([]);
 });
 it('retains every transcribed field, classifications and original zeros',()=>{
  expect(validAssessment(firstBrunoAssessment)).toBe(true);
  expect(Object.keys(firstBrunoAssessment.values).sort()).toEqual(assessmentFields.map(f=>f.id).sort());
  expect(firstBrunoAssessment.values).toMatchObject({weight:68.8,armRelaxedLeft:27,armRelaxedRight:26,triceps:9.5,subscapular:16,forearmLeft:0});
  expect(firstBrunoAssessment.classifications.whr).toBe('Risco Moderado');
 });
 it('migrates once and preserves edits, empty lists and existing workout data',()=>{
  const s=createInitialState();delete s.assessments;s.weights['bench-press']=42;
  const m=migrateState(s);expect(m.assessments).toEqual([firstBrunoAssessment]);expect(m.weights).toEqual(s.weights);
  m.assessments![0].values.weight=70;expect(migrateState(m).assessments![0].values.weight).toBe(70);
  m.assessments=[];expect(migrateState(m).assessments).toEqual([]);
 });
 it('roundtrips backup, isolates profile exports and preserves other profiles on restore',()=>{
  const s=createInitialState();s.assessments!.push({...structuredClone(firstBrunoAssessment),id:'nick',person:'sheet'});
  expect(parseBackup(createBackup(s)).assessments).toEqual(s.assessments);
  expect(JSON.parse(profileBackup(s)).data.assessments).toEqual([firstBrunoAssessment,secondBrunoAssessment]);
  s.selectedPlan='sheet';const payload=profileBackup(s);expect(JSON.parse(payload).data.assessments.map((a:{id:string})=>a.id)).toEqual(['nick']);
  const result=restoreProfile(s,payload);expect(result.assessments).toHaveLength(3);
 });
 it('compares decimal changes without treating absent/zero measurements as gains',()=>{
  expect(assessmentDelta(15.8,14.3)).toBe(-1.5);expect(assessmentDelta(68.8,70)).toBe(1.2);
  expect(assessmentDelta(0,29)).toBeNull();expect(assessmentDelta(undefined,10)).toBeNull();
 });
 it('rejects invalid assessment dates, negative and nonfinite measurements in imports',()=>{
  const s=createInitialState();s.assessments![0].date='2026-02-30';expect(validateState(s)).toBe(false);
  s.assessments![0].date='2026-07-02';s.assessments![0].values.weight=-1;expect(validateState(s)).toBe(false);
  s.assessments![0].values.weight=Infinity;expect(validateState(s)).toBe(false);
 });
 it('protects changed assessments from empty-seed replacement',()=>{
  const remote=createInitialState(),local=createInitialState();local.weights['bench-press']=20;
  expect(canReplaceEmptyCloudSeed(createBackup(remote),createBackup(local))).toBe(true);
  remote.assessments![0].values.weight=72;
  expect(canReplaceEmptyCloudSeed(createBackup(remote),createBackup(local))).toBe(false);
 });
});

it('adds the second assessment once without overwriting edited or manually entered reports',()=>{
 const s=createInitialState();s.assessments=[structuredClone(firstBrunoAssessment)];delete s.secondAssessmentRevision;
 const m=migrateState(s);expect(m.assessments).toEqual([firstBrunoAssessment,secondBrunoAssessment]);
 m.assessments![1].values.weight=71;expect(migrateState(m).assessments![1].values.weight).toBe(71);
 const manual=createInitialState();delete manual.secondAssessmentRevision;manual.assessments![1].id='manual';
 expect(migrateState(manual).assessments).toHaveLength(2);
 expect(validAssessment(secondBrunoAssessment)).toBe(true);
 expect(Object.keys(secondBrunoAssessment.values)).toHaveLength(34);
 expect(assessmentDelta(firstBrunoAssessment.values.leanKg,secondBrunoAssessment.values.leanKg)).toBe(2);
 expect(assessmentDelta(firstBrunoAssessment.values.fatPercent,secondBrunoAssessment.values.fatPercent)).toBe(-0.6);
});
it('places report pointers in the correct bands and clamps off-scale values',()=>{
 for(const scale of reportScales){
  expect(reportPosition(-1,scale.bounds)).toBe(0);expect(reportPosition(10000,scale.bounds)).toBe(100);
  scale.bounds.forEach((v,i)=>expect(reportPosition(v,scale.bounds)).toBeCloseTo(i/(scale.bounds.length-1)*100));
 }
 const fat=reportScales[0];expect(reportPosition(15.2,fat.bounds)).toBeGreaterThan(40);expect(reportPosition(15.2,fat.bounds)).toBeLessThan(60);
});
