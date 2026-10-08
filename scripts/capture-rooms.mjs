import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { installFixture,createArtworkFixture } from '../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs';
import { resolve } from 'node:path';
const origin='http://127.0.0.1:4173', errors=[], pictures=[];
const browser=await chromium.launch({headless:true});
try {
 for (const [id,name,file] of [['classic','CLASSIC ROOM','arcade-room.png'],['darkroom','DARKROOM','darkroom-v1.png'],['galaxyroom','GALAXYROOM','galaxyroom-v1.png']]) {
  const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));
  await installFixture(page,origin,{artworkCall:await createArtworkFixture()});
  await page.goto(origin); await page.getByRole('button',{name:/^Connect (wallet|Browser wallet)$/}).click();
  await page.getByRole('button',{name:/^Friend #7730\b/}).click();
  const game=page.frameLocator('iframe');
  await game.getByRole('heading',{name:'What room do you want to RARE FLIP?',exact:true}).waitFor();
  assert.equal(await game.locator('.room-options button').count(),3);
  assert.equal(await game.locator('.scene canvas').count(),0,'No room movement before selecting');
  await game.getByRole('button',{name:`Select ${name}`,exact:true}).click();
  assert.equal(await game.getByRole('button',{name:`Select ${name}`,exact:true}).getAttribute('aria-pressed'),'true');
  const images=await game.locator('.room-options img').evaluateAll(items=>items.every(image=>image.complete&&image.naturalWidth>0));
  assert(images,'All preview backgrounds loaded');
  const chosenSrc=await game.getByRole('button',{name:`Select ${name}`,exact:true}).locator('img').getAttribute('src');
  if(id==='classic') await page.locator('.rf-game-frame').screenshot({path:resolve('outputs/rare-flip-room-selection.png')});
  await game.getByRole('button',{name:'ENTER ROOM →',exact:true}).click();
  const scene=game.locator('.scene'),canvas=game.locator('.scene canvas');
  assert.equal(await scene.getAttribute('data-room-theme'),id);
  await page.waitForTimeout(350); pictures.push(await canvas.screenshot());
  await page.locator('.rf-game-frame').screenshot({path:resolve(`outputs/rare-flip-${id}-room.png`)});
  await page.keyboard.down('d'); await page.waitForTimeout(200); await page.keyboard.up('d');
  assert(Number(await canvas.getAttribute('data-player-x'))>490,'Movement works in every room');
  await game.getByRole('button',{name:'SHOP',exact:true}).click();
  await page.waitForTimeout(100);
  assert.equal(await game.locator('.live-room-preview').getAttribute('data-theme'),id,'Shop must use selected background');
  await game.getByRole('button',{name:'PET',exact:true}).click();
  await game.getByRole('button',{name:'BUY · 105 FLIP',exact:true}).click();
  await game.getByRole('button',{name:'EQUIP',exact:true}).click();
  await game.getByRole('button',{name:'ROOM',exact:true}).click();
  await game.getByRole('button',{name:'Preview GOLD TROPHY'}).click();
  await game.getByRole('button',{name:'BUY · 60 FLIP',exact:true}).click();
  await game.getByRole('button',{name:'EQUIP',exact:true}).click();
  await game.getByRole('button',{name:'Place at FRONT LEFT',exact:true}).click();
  await game.getByRole('button',{name:'PLACE HERE',exact:true}).click();
  await page.waitForTimeout(250);
  assert.equal(await canvas.getAttribute('data-pet'),'mint-slime');
  assert.equal(await scene.getAttribute('data-decorations'),'trophy');
  if(id!=='classic')await page.locator('.rf-game-frame').screenshot({path:resolve(`outputs/rare-flip-${id}-equipped.png`)});
  await game.getByRole('button',{name:/INTERACT/}).click();
  await game.getByRole('button',{name:'HEADS',exact:true}).click();
  await game.getByRole('button',{name:'FLIP COIN · 2,000 RF',exact:true}).click();
  for(const title of ['Buy coin flip','Use coin flip']) {
    await page.getByText(title,{exact:true}).waitFor();
    await page.getByRole('button',{name:'Confirm preview',exact:true}).click();
    await page.getByText(title,{exact:true}).waitFor({state:'hidden'});
  }
  await game.locator('.result-burst').waitFor();
  if(id!=='classic') await page.locator('.rf-game-frame').screenshot({path:resolve(`outputs/rare-flip-${id}-flip-result.png`)});
  if(id==='galaxyroom') {
   await page.reload();
   await page.getByRole('button',{name:/^Connect (wallet|Browser wallet)$/}).click();
   await page.getByRole('button',{name:/^Friend #7730\b/}).click();
   await game.getByRole('heading',{name:'What room do you want to RARE FLIP?',exact:true}).waitFor();
   await page.setViewportSize({width:390,height:844});
   await game.getByRole('button',{name:'Select GALAXYROOM',exact:true}).tap();
   await page.locator('.rf-game-frame').screenshot({path:resolve('outputs/rare-flip-room-selection-mobile.png')});
   assert.equal(await game.locator('.room-chooser').evaluate(el=>el.scrollWidth>el.clientWidth+2),false);
   await game.getByRole('button',{name:'ENTER ROOM →',exact:true}).tap();
   assert.equal(await game.locator('.scene').getAttribute('data-room-theme'),'galaxyroom');
  }
  await page.close();
 }
 assert(!pictures[0].equals(pictures[1])&&!pictures[1].equals(pictures[2]),'Themes actually render different backgrounds');
 assert.deepEqual(errors,[]); console.log('PASS: initial 3-room chooser, distinct actual backgrounds, movement, shop background, pet/decoration equip, coin results, reload chooser and mobile touch.');
}finally{await browser.close();}
