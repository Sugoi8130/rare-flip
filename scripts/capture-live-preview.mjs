import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {installFixture,createArtworkFixture} from '../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs';
import {resolve} from 'node:path';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173',errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,reducedMotion:'reduce'});
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const draw=CanvasRenderingContext2D.prototype.drawImage,clear=CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.width===1672)window[this.canvas.isConnected?'__actualDraw':'__previewDraw']=[];return clear.apply(this,args);};
  CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(this.canvas.width===1672){const key=this.canvas.isConnected?'__actualDraw':'__previewDraw';window[key]?.push([source instanceof HTMLCanvasElement?'canvas':'image',source.naturalWidth??source.width,source.naturalHeight??source.height,...args]);}return draw.call(this,source,...args);};
 });
 await installFixture(page,origin,{artworkCall:await createArtworkFixture()});
 await page.goto(origin);await page.getByRole('button',{name:/^Connect (wallet|Browser wallet)$/}).click();await page.getByRole('button',{name:/^Friend #7730\b/}).click();
 const game=page.frameLocator('iframe');await game.getByRole('button',{name:'ENTER ROOM →',exact:true}).click();
 await game.getByRole('button',{name:'SHOP',exact:true}).click();await game.getByRole('button',{name:'PET',exact:true}).click();
 for(let i=0;i<4;i++)await game.getByRole('button',{name:'DEMO +500 FLIP',exact:true}).click();
 async function parity(label){await page.waitForTimeout(180);const calls=await game.locator('.live-room-preview').evaluate(()=>({actual:window.__actualDraw,preview:window.__previewDraw}));assert.deepEqual(calls.preview,calls.actual,`${label}: same sprite bounds, decoration placement and effect draw calls as real room`);}
 for(const [category,items]of [
  ['COSTUME',[['CLOUD BEANIE',60],['MINT SKATEBOARD',35],['PRISM WINGS',25],['ROYAL CROWN',75],['ARCANE HAT',55],['ROYAL AURA',100]]],
  ['PET',[['MINT SLIME',105],['CLOUD FOX',180],['MOON BAT',225],['STAR DRAGON',300]]],
  ['EFFECTS',[['HEART BUBBLES',40],['MOON ORBIT',65],['PARTY POP',120]]],
  ['ROOM',[['JELLY AQUARIUM',15],['LUCKY CLOUD CAT',45],['PEACH BLOSSOM',90],['GOLD TROPHY',60],['FRIEND STATUE',75],['RETRO RADIO',45]]],
 ]) {
  await game.getByRole('button',{name:category,exact:true}).click();
  for(const [name,price]of items){
   await game.getByRole('button',{name:`Preview ${name}`,exact:true}).click();await game.getByRole('button',{name:`BUY · ${price} FLIP`,exact:true}).click();await game.getByRole('button',{name:'EQUIP',exact:true}).click();
   if(category==='ROOM'){await game.locator('.placement-spot:not(:disabled)').first().click();await game.getByRole('button',{name:'PLACE HERE',exact:true}).click();await game.getByRole('button',{name:'SHOP',exact:true}).click();await game.getByRole('button',{name:`Preview ${name}`,exact:true}).click();}
   await parity(name);
  }
  await page.locator('.rf-game-frame').screenshot({path:resolve(`outputs/rare-flip-live-preview-${category.toLowerCase()}.png`)});
 }
 await game.getByRole('button',{name:'EFFECTS',exact:true}).click();await game.getByRole('button',{name:'Preview PARTY POP',exact:true}).click();
 await page.emulateMedia({reducedMotion:'no-preference'});
 const preview=game.locator('.live-room-preview'),before=await preview.screenshot();await page.waitForTimeout(350);assert(!(await preview.screenshot()).equals(before),'Live effect animation must change actual pixels');
 await game.getByRole('button',{name:'TEST WIN EFFECT',exact:true}).click();await page.waitForTimeout(250);assert.equal(await preview.getAttribute('data-win'),'true');
 await page.locator('.rf-game-frame').screenshot({path:resolve('outputs/rare-flip-live-preview-win.png')});
 await page.setViewportSize({width:390,height:844});await page.locator('.rf-game-frame').screenshot({path:resolve('outputs/rare-flip-live-preview-mobile.png')});
 assert.equal(await game.locator('.flip-shop').evaluate(el=>el.scrollWidth>el.clientWidth+2),false);
 assert.deepEqual(errors,[]);console.log('PASS: 19 items share identical real-room draw sizes/positions, selected slot replacement, live effect animation, cosmetic WIN preview and mobile fit.');
}finally{await browser.close();}
