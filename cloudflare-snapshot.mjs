import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const FEED='https://vsbash-vip.vsbash.workers.dev/api/leaderboard.json';
export function validateSnapshot(value,now=Math.floor(Date.now()/1000)) {
  if(!value||value.schema!==1||value.world!=='VSBASH'||value.source!=='cloudflare-d1'||typeof value.automaticResultReporting!=='boolean'||
    !Number.isSafeInteger(value.generatedAt)||value.generatedAt<1||value.generatedAt>now+300)throw Error('Invalid Cloudflare snapshot');
  for(const name of ['championships','medals']) {
    const rows=value[name];if(!Array.isArray(rows)||rows.length>100)throw Error('Invalid ranking list');
    const seen=new Set();let previous=null;
    for(const row of rows) {
      if(!row||typeof row.playerKey!=='string'||!/^vsb_[A-Za-z0-9_-]{16,64}$/.test(row.playerKey)||seen.has(row.playerKey)||
        typeof row.displayName!=='string'||!row.displayName.trim()||row.displayName.length>64||/[\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(row.displayName)||
        !Number.isSafeInteger(row.level)||row.level<1||row.level>2000005||!Number.isSafeInteger(row.score)||row.score<1||row.score>10000000)throw Error('Invalid ranking row');
      if(previous&&(previous.score<row.score||previous.score===row.score&&(previous.level<row.level||previous.level===row.level&&previous.playerKey>row.playerKey)))throw Error('Unsorted ranking');
      seen.add(row.playerKey);previous=row;
    }
  }
  // Strip unexpected fields. No private account or membership fields are mirrored.
  const rows=name=>value[name].map(({playerKey,displayName,level,score})=>({playerKey,displayName,level,score}));
  return {schema:1,world:'VSBASH',generatedAt:value.generatedAt,source:'cloudflare-d1',automaticResultReporting:value.automaticResultReporting,
    championships:rows('championships'),medals:rows('medals')};
}
export async function fetchSnapshot(fetcher=fetch) {
  const response=await fetcher(FEED,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'application/json'}});
  if(!response.ok||!response.headers.get('Content-Type')?.includes('application/json'))throw Error('Cloudflare feed unavailable');
  const reader=response.body.getReader(),chunks=[];let bytes=0;
  try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>131072){await reader.cancel();throw Error('Oversized snapshot');}chunks.push(part.value);}}finally{reader.releaseLock();}
  const text=Buffer.concat(chunks).toString('utf8');if(text.length>65536)throw Error('Snapshot exceeds world limit');
  return validateSnapshot(JSON.parse(text));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const snapshot=await fetchSnapshot();const output=new URL('./public/',import.meta.url);await mkdir(output,{recursive:true});
  await writeFile(new URL('leaderboard.json',output),JSON.stringify(snapshot));await writeFile(new URL('.nojekyll',output),'');
  console.log(`Mirrored Cloudflare rankings: ${snapshot.championships.length} championships / ${snapshot.medals.length} medals. Automatic result reporting: ${snapshot.automaticResultReporting}.`);
}
