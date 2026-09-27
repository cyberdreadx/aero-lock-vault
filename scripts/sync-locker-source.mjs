// Copies the locker's Solidity source into the edge functions, which can't read src/.
// Run after changing src/assets/locker-source.sol: npm run sync:locker-source
import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync('src/assets/locker-source.sol', 'utf8');
writeFileSync(
  'supabase/functions/_shared/lockerSource.ts',
  `// Generated from src/assets/locker-source.sol by scripts/sync-locker-source.mjs - do not edit.\n` +
    `export const LOCKER_SOURCE = ${JSON.stringify(source)};\n`,
);
console.log(`wrote supabase/functions/_shared/lockerSource.ts (${source.length} chars)`);
