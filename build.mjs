import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const MAX = 10_000_000;
export function levelFromWins(wins) {
  if (wins < 8) return 1 + Math.floor(wins / 2);
  if (wins < 23) return 5 + Math.floor((wins - 8) / 3);
  return 10 + Math.floor((wins - 23) / 5);
}

export function buildSnapshot(source, generatedAt = Math.floor(Date.now() / 1000)) {
  if (!source || source.schema !== 1 || source.world !== 'VSBASH' || !Array.isArray(source.profiles) || source.profiles.length > 100_000)
    throw new Error('Invalid VSBASH profile registry');
  if (!Number.isSafeInteger(generatedAt) || generatedAt <= 0) throw new Error('Invalid snapshot timestamp');
  const keys = new Set();
  const profiles = source.profiles.map(p => {
    if (!p || typeof p.playerKey !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(p.playerKey) || keys.has(p.playerKey))
      throw new Error('Duplicate or invalid stable player key');
    keys.add(p.playerKey);
    if (typeof p.displayName !== 'string' || p.displayName.length > 64 || !p.displayName.trim() || /[\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(p.displayName))
      throw new Error('Invalid display name');
    for (const field of ['progressionWins', 'championships', 'medals'])
      if (!Number.isSafeInteger(p[field]) || p[field] < 0 || p[field] > MAX) throw new Error(`Invalid ${field}`);
    if (p.medals > p.championships) throw new Error('Medals cannot exceed full-match championships');
    // Public snapshots contain only approved totals. Never accept browser-submitted scores.
    // Identity and match-result ingestion are a separate, not-yet-connected bridge.
    if (p.reviewed !== true) throw new Error('Unreviewed profile cannot be published');
    return {playerKey:p.playerKey, displayName:p.displayName, level:levelFromWins(p.progressionWins), championships:p.championships, medals:p.medals};
  });
  function top(field) {
    return profiles.filter(p => p[field] > 0).sort((a,b) => b[field] - a[field] || b.level - a.level || (a.playerKey < b.playerKey ? -1 : a.playerKey > b.playerKey ? 1 : 0))
      .slice(0, 100).map(p => ({playerKey:p.playerKey, displayName:p.displayName, level:p.level, score:p[field]}));
  }
  return {schema:1,world:'VSBASH',generatedAt,championships:top('championships'),medals:top('medals')};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = JSON.parse(await readFile(new URL('./data/profiles.json', import.meta.url), 'utf8'));
  const snapshot = buildSnapshot(source);
  const output = new URL('./public/', import.meta.url);
  await mkdir(output, {recursive:true});
  await writeFile(new URL('leaderboard.json', output), JSON.stringify(snapshot));
  await writeFile(new URL('.nojekyll', output), '');
  console.log(`VSBASH snapshot built: ${snapshot.championships.length} championship entries, ${snapshot.medals.length} medal entries.`);
}
