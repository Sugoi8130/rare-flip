import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.RARE_FLIP_TEST_HOST??'http://localhost:4180';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
 const game=page.frameLocator('iframe');await game.getByRole('button',{name:'ENTER ROOM →',exact:true}).click();
 await game.getByRole('button',{name:/INTERACT/}).click();
 for(const [bet,row,outcome]of [[2000,0,'WIN'],[10000,1,'LOSE'],[100000,0,'WIN']]){
  const response=await page.request.post(origin+'/__friendsdk/controls',{data:{topUp:'200000',forceRow:{action:'flip'+bet,row},randomnessDelayMs:50}});assert(response.ok());
  // Refresh availability through a fresh host session, as holdings are read on entry.
  await page.reload();await game.getByRole('button',{name:'ENTER ROOM →',exact:true}).click();await game.getByRole('button',{name:/INTERACT/}).click();
  await game.getByRole('button',{name:`Bet ${bet.toLocaleString('en-US')} RF`,exact:true}).click();
  await game.getByRole('button',{name:'HEADS',exact:true}).click();
  await game.getByRole('button',{name:`FLIP COIN · ${bet.toLocaleString('en-US')} RF`,exact:true}).click();
  await page.getByRole('button',{name:/^Pay [\d,]+ RF$/}).click();
  await game.locator('.result-burst').waitFor({timeout:45000});
  assert.equal(await game.locator('.result-burst strong').innerText(),outcome);
  assert.equal(await game.getByTestId('flip-balance').innerText(),`${250+bet/2000} FLIP`);
  assert.equal(await game.getByRole('button',{name:/^CLAIM /}).count(),0,'SDK pays the Friend wallet automatically');
 }
 await page.screenshot({path:'outputs/rare-flip-sdk1-host.png'});
 await page.setViewportSize({width:390,height:844});
 const bounds=await game.locator('.game-shell').boundingBox();assert(bounds.width<=390);
 assert.deepEqual(errors,[]);console.log('PASS SDK 1.0 real dev host: 2K/10K/100K, WIN/LOSE, FLIP, automatic payout, mobile.');
}finally{await browser.close();}
