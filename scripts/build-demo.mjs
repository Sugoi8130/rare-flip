import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const sdkRequire=createRequire(import.meta.resolve('@rarefriends/friendsdk'));
const {build}=sdkRequire('esbuild');
const outdir=resolve(process.argv[2]&&process.argv[2]!=='build'?process.argv[2]:'dist');await mkdir(outdir,{recursive:true});
await build({entryPoints:['games/rare-flip/demo.tsx'],outdir,entryNames:'demo',bundle:true,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'},loader:{'.png':'file'},assetNames:'demo-assets/[name]-[hash]'});
await writeFile(resolve(outdir,'demo.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'"><title>Rare Flip — No-wallet Demo</title><link rel="stylesheet" href="./demo.css"></head><body><main id="root"></main><script src="./demo.js"></script></body></html>`);
console.log('Built SDK 1.0 sample-art demo: no wallet/RPC; simulated economy only.');
