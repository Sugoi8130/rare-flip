import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {installFixture,createArtworkFixture} from '../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173',errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>errors.push(e.message));
 await installFixture(page,origin,{artworkCall:await createArtworkFixture()});await page.goto(origin);
 await page.getByRole('button',{name:/^Connect (wallet|Browser wallet)$/}).click();
 await page.getByRole('button',{name:/^Friend #7730\b/}).click();
 const game=page.frameLocator('iframe'),balance=game.getByTestId('flip-balance');
 await game.getByRole('button',{name:'ENTER ROOM →',exact:true}).click();
 await game.getByRole('button',{name:/INTERACT/}).click();
 let total=250;
 for(const [bet,roll,outcome] of [[2000,1500,'WIN'],[10000,9999,'LOSE'],[100000,1500,'WIN']]) {
  await page.evaluate(value=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>array instanceof Uint32Array&&array.length===1?(array[0]=value,array):original(array);},roll);
  await game.getByRole('button',{name:`Bet ${bet.toLocaleString('en-US')} RF`,exact:true}).click();
  await game.getByRole('button',{name:'HEADS',exact:true}).click();
  await game.getByRole('button',{name:`FLIP COIN · ${bet.toLocaleString('en-US')} RF`,exact:true}).click();
  await page.getByText('Buy coin flip',{exact:true}).waitFor();
  assert.equal(await balance.innerText(),`${total} FLIP`,'Unconfirmed wager gives no FLIP');
  await page.getByRole('button',{name:'Confirm preview',exact:true}).click();
  await page.getByText('Use coin flip',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Confirm preview',exact:true}).click();
  await game.locator('.result-burst').waitFor();
  assert.equal(await game.locator('.result-burst strong').innerText(),outcome);
  total+=bet/2000;
  assert.equal(await balance.innerText(),`${total} FLIP`);
  if(outcome==='WIN') {
   await game.getByRole('button',{name:/^CLAIM /}).click();
   await page.getByRole('button',{name:'Confirm preview',exact:true}).click();
   await game.getByRole('button',{name:'NEXT ROUND',exact:true}).waitFor();
   assert.equal(await balance.innerText(),`${total} FLIP`,'Claim cannot duplicate credit');
   await game.getByRole('button',{name:'NEXT ROUND',exact:true}).click();
  } else await game.getByRole('button',{name:'TRY AGAIN',exact:true}).click();
  await game.getByRole('button',{name:'RULES',exact:true}).click();
  await game.getByRole('button',{name:'Close RULES',exact:true}).click();
  assert.equal(await balance.innerText(),`${total} FLIP`,'Re-render cannot duplicate credit');
 }
 assert.equal(total,306);assert.deepEqual(errors,[]);
 console.log('PASS: 2K/10K/100K bets earn 1/5/50 FLIP; WIN and LOSE count; no credit before confirmation or duplicate on claim/re-render.');
} finally {await browser.close();}
