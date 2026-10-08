import {cp} from 'node:fs/promises';
import {resolve} from 'node:path';
// Keep the SDK preview host and identity gate; publish only simulated gameplay.
await import('./preview.mjs');
await cp(resolve('.friendsdk/preview'),resolve('dist'),{recursive:true});
await import('./build-demo.mjs');
console.log('Exported simulated Rare Flip preview for static hosting.');
