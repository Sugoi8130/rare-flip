import {parseAmount,type Game,type TransactionResult} from '@rarefriends/friendsdk';
import {definition,type FlipClient,type GameSnapshot,type GamePlay} from './game-model';
// UI adapter. The platform owns identity, confirmation, randomness and payouts.
export function createSdkClient(game:Game):FlipClient{
 const records=new Map<bigint,TransactionResult>(),ids=new Map<string,bigint>();
 function track(tx:TransactionResult){const key=tx.hash||tx.id;let id=ids.get(key);if(!id){id=BigInt(ids.size+1);ids.set(key,id);}records.set(id,tx);return id;}
 async function sync(){for(const tx of await game.transactions())if(/^flip\d+$/.test(tx.action))track(tx);}
 const units=(tx:TransactionResult)=>BigInt(tx.action.slice(4))/2000n;
 return {definition,
  async read():Promise<GameSnapshot>{
   const [holdings]=await Promise.all([game.holdings(),sync()]);
   const plays:GamePlay[]=[],wagerQuantities:Record<string,bigint>={};
   for(const [id,tx]of records){wagerQuantities[String(id)]=units(tx);if(tx.status!=='failed'&&!tx.seen)plays.push({id,outcomeId:null});}
   return {friendId:BigInt(game.friend.id),rfBalance:parseAmount(holdings.currency?.balance??'0',18),consumables:0n,freeStake:10n**36n,inventory:[0n,0n],plays,wagerQuantities,available:Object.fromEntries(Object.entries(holdings.actions).map(([name,a])=>[name,a.available&&a.maxQuantity>=1&&game.mode==='dev']))};
  },
  async buy(){/* A draw charges the wager directly; do not double-buy. */},
  async play(quantity){
   if(game.mode!=='dev')throw new Error('Live payments are not configured for this version.');
   if(quantity<1n||quantity>50n)throw new Error('Invalid wager.');
   await sync();if([...records.values()].some(tx=>!tx.seen&&tx.status!=='failed'))throw new Error('Resume the existing flip first.');
   const tx=await game.transact('flip'+String(quantity*2000n),{quantity:1});
   const id=track(tx);return [{id,outcomeId:null}];
  },
  async settle(id){
   await sync();const tx=records.get(id);if(!tx)throw new Error('The flip was not found.');
   if(tx.status==='failed')throw new Error(tx.error??'The payment failed.');
   if(tx.status!=='settled')throw new Error('Your flip is pending. Resume it without another wager.');
   if(tx.outcomes.length!==1||![0,1].includes(tx.outcomes[0].row))throw new Error('Invalid flip outcome.');
   await game.acknowledge(tx.id);records.set(id,{...tx,seen:true});return {id,outcomeId:tx.outcomes[0].row===0?1:2};
  },
  async redeem(){throw new Error('SDK 1.0 credits settled winnings automatically.');},
 };
}
