import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {installFixture,createArtworkFixture} from '../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs';
import {resolve} from 'node:path';
const origin='http://127.0.0.1:4173',errors=[];
const browser=await chromium.launch({headless:true});
try {
 for(const [id,name,edge] of [['classic','CLASSIC ROOM',331],['darkroom','DARKROOM',315],['galaxyroom','GALAXYROOM',315]]) {
  const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   const original=CanvasRenderingContext2D.prototype.drawImage,clear=CanvasRenderingContext2D.prototype.clearRect;
   CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.width===1672){window.__roomFrame={friend:false,erased:false,images:0};window.__roomBackground=null;}return clear.apply(this,args);};
   CanvasRenderingContext2D.prototype.drawImage=function(source,...args){
    if(this.canvas.width===1672){
     const frame=window.__roomFrame;
     if(frame){
      if(!frame.images)window.__roomBackground=source;
      if(frame.friend&&source===window.__roomBackground)frame.erased=true;
      if(source instanceof HTMLCanvasElement&&source.width===18&&source.height===18){frame.friend=true;frame.friendBox=args;}
      frame.images++;
     }
    }
    return original.call(this,source,...args);
   };
  });
  await installFixture(page,origin,{artworkCall:await createArtworkFixture()});
  await page.goto(origin);await page.getByRole('button',{name:/^Connect (wallet|Browser wallet)$/}).click();
  await page.getByRole('button',{name:/^Friend #7730\b/}).click();
  const game=page.frameLocator('iframe'),canvas=game.locator('.scene > canvas');
  await game.getByRole('button',{name:`Select ${name}`,exact:true}).click();
  await game.getByRole('button',{name:'ENTER ROOM →',exact:true}).click();
  async function visible(state){
   await page.waitForTimeout(100);
   const frame=await canvas.evaluate(()=>window.__roomFrame);
   assert(frame.friend,`${id}/${state}: actual Friend sprite must be drawn`);
   assert.equal(frame.erased,false,`${id}/${state}: room crop must never paint over Friend`);
  }
  await visible('idle');
  await game.getByRole('button',{name:'SHOP',exact:true}).click();
  await game.getByRole('button',{name:'COSTUME',exact:true}).click();
  for(const [item,price]of [['MINT SKATEBOARD',35],['ROYAL AURA',100]]){
   await game.getByRole('button',{name:`Preview ${item}`}).click();
   await game.getByRole('button',{name:`BUY · ${price} FLIP`,exact:true}).click();
   await game.getByRole('button',{name:'EQUIP',exact:true}).click();
  }
  await game.getByRole('button',{name:'PET',exact:true}).click();
  await game.getByRole('button',{name:'BUY · 105 FLIP',exact:true}).click();
  await game.getByRole('button',{name:'EQUIP',exact:true}).click();
  await game.getByRole('button',{name:'Close shop'}).click();
  await page.keyboard.down('w');await page.waitForTimeout(600);await page.keyboard.up('w');
  const y=Number(await canvas.getAttribute('data-player-y'));
  assert(y>=edge&&y<edge+7,`${id}: must reach and stop at table front, got ${y}`);
  await visible('table-edge');
  await page.locator('.rf-game-frame').screenshot({path:resolve(`outputs/rare-flip-${id}-visibility-edge.png`)});
  await page.keyboard.down('d');await page.waitForTimeout(100);await page.keyboard.up('d');await visible('walk-right');
  await page.keyboard.down('a');await page.waitForTimeout(100);await page.keyboard.up('a');await visible('walk-left');
  await game.getByRole('button',{name:/INTERACT/}).click();await visible('seated');
  for(const [roll,outcome]of [[1500,'WIN'],[9999,'LOSE']]){
   await page.evaluate(value=>{const fallback=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>array instanceof Uint32Array&&array.length===1?(array[0]=value,array):fallback(array);},roll);
   await game.getByRole('button',{name:'HEADS',exact:true}).click();
   await game.getByRole('button',{name:'FLIP COIN · 2,000 RF',exact:true}).click();
   for(const title of ['Buy coin flip','Use coin flip']){await page.getByText(title,{exact:true}).waitFor();await page.getByRole('button',{name:'Confirm preview',exact:true}).click();await page.getByText(title,{exact:true}).waitFor({state:'hidden'});}
   await visible('flipping');
   await game.locator('.result-burst').waitFor();
   assert.equal(await game.locator('.result-burst strong').innerText(),outcome);
   for(let i=0;i<8;i++)await visible(outcome+'-animation');
   await page.locator('.rf-game-frame').screenshot({path:resolve(`outputs/rare-flip-${id}-visibility-${outcome.toLowerCase()}.png`)});
   if(outcome==='WIN'){await game.getByRole('button',{name:/^CLAIM /}).click();await page.getByRole('button',{name:'Confirm preview',exact:true}).click();await game.getByRole('button',{name:'NEXT ROUND',exact:true}).click();}
  }
  await page.setViewportSize({width:390,height:844});await visible('mobile-result');
  await page.locator('.rf-game-frame').screenshot({path:resolve(`outputs/rare-flip-${id}-visibility-mobile.png`)});
  await page.close();console.log(`PASS ${id}: table edge, both walking directions, costume/pet, flip, WIN/LOSE animation and mobile`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
