// Locks every published document link and page address that is not locked yet (src/config/locks.json).
// Add-only: it never removes or rebinds a lock. Run after a successful deploy, so whatever just went
// live is protected from then on; the deploy workflow does this and commits the file.
//
//   npm run lock
import { fileURLToPath } from 'node:url';
import { addNewLocks, collectPublished, readLocks, writeLocks } from '../src/lib/locks.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const { locks, added } = addNewLocks(readLocks(root), collectPublished(`${root}/src/content`));

if (added.length === 0) {
  console.log('Nothing new to lock.');
} else {
  writeLocks(root, locks);
  console.log(`Locked ${added.length} newly published address${added.length === 1 ? '' : 'es'}:`);
  for (const a of added) console.log(`  ${a}`);
}
