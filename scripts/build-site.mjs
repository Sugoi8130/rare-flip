import {cp,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const sdkRoot=dirname(fileURLToPath(import.meta.resolve('@rarefriends/friendsdk/package.json')));
const result=spawnSync(process.execPath,[resolve(sdkRoot,'bin/friendsdk.js'),'build'],{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);
await cp(resolve('.friendsdk/build/client'),resolve('dist/sdk'),{recursive:true});
await import('./build-demo.mjs');
// A static host cannot supply the platform session. The SDK release is sdk/;
// standalone visitors enter the clearly labelled no-wallet demo.
await writeFile(resolve('dist/index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./demo.html"><title>Rare Flip Demo</title></head><body><a href="./demo.html">Play the no-wallet demo</a></body></html>');
console.log('Static demo exported. Host-only SDK release: .friendsdk/build.');
