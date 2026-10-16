import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSnapshot, levelFromWins} from './build.mjs';
const row = (playerKey, championships=5, medals=2, progressionWins=4) => ({playerKey,displayName:playerKey,championships,medals,progressionWins,reviewed:true});
const source = profiles => ({schema:1,world:'VSBASH',profiles});
test('level boundaries exactly match existing Udon progression', () => {
  for (const [w,l] of [[0,1],[1,1],[2,2],[7,4],[8,5],[10,5],[11,6],[22,9],[23,10],[27,10],[28,11],[33,12]]) assert.equal(levelFromWins(w),l);
});
test('trophies and medals have independent rankings; ties are deterministic', () => {
  const s = buildSnapshot(source([row('c',8,1),row('b',3,3),row('a',8,2)]),100);
  assert.deepEqual(s.championships.map(x=>x.playerKey),['a','c','b']);
  assert.deepEqual(s.medals.map(x=>x.playerKey),['b','a','c']);
});
test('same display name is not an identity key', () => {
  const a=row('a'),b=row('b');a.displayName=b.displayName='Same name';
  assert.equal(buildSnapshot(source([a,b]),100).championships.length,2);
  assert.throws(()=>buildSnapshot(source([a,a]),100));
});
test('empty data remains empty; zero scores do not earn ranks', () => {
  const s=buildSnapshot(source([row('a',0,0,0)]),100);
  assert.deepEqual(s.championships,[]);assert.deepEqual(s.medals,[]);
});
test('invalid and unreviewed totals cannot publish', () => {
  for (const bad of [{medals:6},{championships:-1},{medals:0.5},{progressionWins:10_000_001},{reviewed:false},{displayName:'bad\nname'}])
    assert.throws(()=>buildSnapshot(source([{...row('a'),...bad}]),100));
});
test('bounded top 100 and no private fields in public output', () => {
  const rows=Array.from({length:150},(_,i)=>({...row('p'+i,i+1,0,0),vrchatId:'private_mapping',email:'never_export'}));
  const s=buildSnapshot(source(rows),100);
  assert.equal(s.championships.length,100);assert.equal(s.championships[0].score,150);
  assert.ok(!JSON.stringify(s).includes('private_mapping'));assert.ok(!JSON.stringify(s).includes('never_export'));
});
