import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {installFixture,createArtworkFixture} from '../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs';
import {resolve} from 'node:path';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173',errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
 await installFixture(page,origin,{artworkCall:await createArtworkFixture()});await page.goto(origin);
 await page.getByRole('button',{name:/^Connect (wallet|Browser wallet)$/}).click();await page.getByRole('button',{name:/^Friend #7730\b/}).click();
 const game=page.frameLocator('iframe');await game.getByRole('button',{name:'ENTER ROOM →',exact:true}).click();
 const flip=game.getByTestId('flip-balance'),rf=await game.getByTestId('balance').innerText();assert.equal(await flip.innerText(),'250 FLIP');
 await game.getByRole('button',{name:'SHOP',exact:true}).click();await game.getByRole('button',{name:'BUY · 15 FLIP',exact:true}).click();
 assert.equal(await flip.innerText(),'235 FLIP');
 await game.getByRole('button',{name:'PET',exact:true}).click();await game.getByRole('button',{name:'DEMO +500 FLIP',exact:true}).click();assert.equal(await flip.innerText(),'735 FLIP');
 await game.getByRole('button',{name:'Close shop'}).click();assert.equal(await game.getByTestId('balance').innerText(),rf);
 await page.locator('.rf-game-frame').screenshot({path:resolve('outputs/rare-flip-currency-hud.png')});
 await game.getByRole('button',{name:'RULES',exact:true}).click();
 const rules=game.getByRole('dialog',{name:'RULES',exact:true});assert.match(await rules.innerText(),/1 FLIP for every 2,000 RF/);assert.match(await rules.innerText(),/Both WIN and LOSE/);assert.doesNotMatch(await rules.innerText(),/DEMO \+500|250 sample/);
 await game.getByRole('heading',{name:'HOW TO EARN FLIP',exact:true}).scrollIntoViewIfNeeded();await page.locator('.rf-game-frame').screenshot({path:resolve('outputs/rare-flip-flip-rules.png')});
 await game.getByRole('button',{name:'Close RULES',exact:true}).click();await page.setViewportSize({width:390,height:844});
 const hud=await game.locator('.hud-actions').boundingBox(),scene=await game.locator('.game-shell').boundingBox();assert(hud.x>=scene.x&&hud.x+hud.width<=scene.x+scene.width+1,'Mobile HUD fits');
 await page.locator('.rf-game-frame').screenshot({path:resolve('outputs/rare-flip-currency-hud-mobile.png')});
 await game.getByRole('button',{name:'RULES',exact:true}).tap();await game.getByRole('heading',{name:'HOW TO EARN FLIP',exact:true}).scrollIntoViewIfNeeded();assert(await game.getByRole('heading',{name:'HOW TO EARN FLIP',exact:true}).isVisible());
 await page.locator('.rf-game-frame').screenshot({path:resolve('outputs/rare-flip-flip-rules-mobile.png')});assert.deepEqual(errors,[]);
 console.log('PASS: HUD FLIP syncs purchase/top-up; RF unchanged; accurate demo rules and mobile bounds/scroll.');
}finally{await browser.close();}
