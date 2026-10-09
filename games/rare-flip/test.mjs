import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {parseAmount} from '@rarefriends/friendsdk';
import {createVariablePreview} from '../../scripts/variable-preview.mjs';
const RF=10n**18n,manifest=JSON.parse(await readFile('friendsdk.json','utf8'));
const definition={price:2000n*RF,outcomes:[{reward:3840n*RF,chanceBps:5000},{reward:0n,chanceBps:5000}]};
assert.equal(Object.keys(manifest.actions).length,50);
for(let u=1;u<=50;u++){
 const action=manifest.actions['flip'+u*2000];assert.equal(action.price,String(u*2000));assert.equal(action.maxQuantity,1);
 assert.deepEqual(action.table,[{weight:5000,pays:String(u*3840)},{weight:5000}]);
 assert.equal(action.lane,u<=25?'small':'large');
}
for(const units of [1n,5n,25n,50n])for(const roll of [0,9999]){
 const {client}=createVariablePreview(definition,{friendId:7730n,stake:2000000n*RF,rfBalance:200000n*RF,draw:()=>roll});
 await assert.rejects(client.buy(0n));await assert.rejects(client.buy(51n));await client.buy(units);
 const [play]=await client.play(units);await assert.rejects(client.play(units));const result=await client.settle(play.id);
 assert.equal(result.outcomeId,roll===0?1:2);
 if(roll===0){await client.redeem(1,units);assert.equal((await client.read()).rfBalance,(200000n+1840n*units)*RF);}
 else assert.equal((await client.read()).rfBalance,(200000n-2000n*units)*RF);
}
const require=createRequire(import.meta.resolve('@rarefriends/friendsdk'));
await require('esbuild').build({entryPoints:['games/rare-flip/sdk-client.ts'],outfile:'.friendsdk/tests/sdk-client.mjs',bundle:true,platform:'node',format:'esm',packages:'external'});
const {createSdkClient}=await import('../../.friendsdk/tests/sdk-client.mjs');
let records=[],sent=0,ack=0,paidAction;
const host={mode:'dev',friend:{id:'117713'},transactions:async()=>records,holdings:async()=>({currency:{balance:'10000'},actions:{flip2000:{available:true,maxQuantity:1}}}),transact:async action=>{sent++;paidAction=action;const tx={id:'tx-0xabc',hash:'0xabc',action,quantity:1,status:'pending',outcomes:[],seen:false};records=[tx];return tx;},acknowledge:async id=>{ack++;records=records.map(tx=>tx.id===id?{...tx,seen:true}:tx);}};
const client=createSdkClient(host);assert.equal((await client.read()).rfBalance,parseAmount('10000',18));
const [pending]=await client.play(1n);assert.equal(paidAction,'flip2000');await assert.rejects(client.settle(pending.id),/pending/);await assert.rejects(client.play(1n),/Resume/);assert.equal(sent,1);
records=[{...records[0],id:'small-42',status:'settled',outcomes:[{row:0,pays:'3840'}]}];
const snapshot=await client.read();assert.equal(snapshot.plays[0].id,pending.id,'Hash preserves id after placement');assert.equal(snapshot.wagerQuantities[String(pending.id)],1n);
assert.equal((await client.settle(pending.id)).outcomeId,1);assert.equal(ack,1);assert.equal((await client.read()).plays.length,0);
host.mode='live';await assert.rejects(client.play(1n),/not configured/);assert.equal(sent,1,'No live payment sent');
for(const args of [['scripts/build-demo.mjs','.friendsdk/demo'],['scripts/test-no-wallet-demo.mjs']]){const run=spawnSync(process.execPath,args,{stdio:'inherit'});assert.equal(run.status,0);}
console.log('PASS: SDK 1.0 manifest, all wager tiers, simulated economy, pending/hash/ack handling, live-payment guard, desktop/mobile demo.');
