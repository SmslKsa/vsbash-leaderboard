import test from 'node:test';import assert from 'node:assert/strict';
import {validateSnapshot,fetchSnapshot,FEED} from './cloudflare-snapshot.mjs';
const row=(id,score=4,level=3)=>({playerKey:'vsb_'+id.repeat(16),displayName:'Synthetic '+id,score,level});
const snapshot=(changes={})=>({schema:1,world:'VSBASH',generatedAt:Math.floor(Date.now()/1000),source:'cloudflare-d1',automaticResultReporting:false,championships:[row('a')],medals:[],...changes});
test('mirror accepts validated Cloudflare rankings and preserves incomplete-reporting status',()=>{
  const input=snapshot({championships:[{...row('a'),privateField:'never publish'}],privateMembership:'never publish'}),out=validateSnapshot(input);
  assert.equal(out.automaticResultReporting,false);assert.equal(out.source,'cloudflare-d1');assert.equal(out.privateMembership,undefined);assert.equal(out.championships[0].privateField,undefined);
});
test('mirror rejects wrong source, invalid totals, duplicate identities, and unsorted data',()=>{
  for(const bad of [snapshot({source:'other'}),snapshot({world:'other'}),snapshot({generatedAt:Infinity}),snapshot({championships:[row('a'),row('a')]}),snapshot({championships:[row('a',-1)]}),snapshot({championships:[row('a',1),row('b',5)]}),snapshot({championships:[row('b'),row('a')]}),snapshot({championships:[row('a',1.5)]})])assert.throws(()=>validateSnapshot(bad));
});
test('mirror fetches only the fixed public endpoint without credentials or redirects',async()=>{
  const out=await fetchSnapshot(async(url,options)=>{assert.equal(url,FEED);assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,undefined);return Response.json(snapshot());});assert.equal(out.championships[0].score,4);
});
test('upstream errors, HTML, malformed JSON, and oversized data fail publication',async()=>{
  for(const response of [new Response('offline',{status:503}),new Response('<html/>',{headers:{'Content-Type':'text/html'}}),new Response('{broken',{headers:{'Content-Type':'application/json'}}),new Response('x'.repeat(140000),{headers:{'Content-Type':'application/json'}})])await assert.rejects(()=>fetchSnapshot(async()=>response));
});
