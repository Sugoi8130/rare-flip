import assert from "node:assert/strict";
import { chromium } from "playwright";
import { installFixture, createArtworkFixture } from "../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs";
import { resolve } from "node:path";

const origin = "http://127.0.0.1:4173", defaults = { aquarium: { x:235,y:365 }, cat: { x:725,y:365 }, blossom: { x:625,y:390 } };
const browser = await chromium.launch({ headless:true });
const errors = [];
async function openGame() {
  const page = await browser.newPage({ viewport:{ width:1280,height:800 }, hasTouch:true });
  page.on("pageerror", error => errors.push(error.message));
  await installFixture(page, origin, { artworkCall:await createArtworkFixture() });
  await page.goto(origin); await page.getByRole("button", { name:/^Connect (wallet|Browser wallet)$/ }).click();
  await page.getByRole("button", { name:/^Friend #7730\b/ }).click();
  await page.frameLocator("iframe").getByRole("button",{ name:"ENTER ROOM →",exact:true }).click();
  const game = page.frameLocator("iframe"); await game.getByRole("button", { name:"SHOP",exact:true }).waitFor();
  return { page,game };
}
try {
  const { page,game } = await openGame();
  await game.getByRole("button", { name:"SHOP",exact:true }).click();
  for (const [name,price] of [["JELLY AQUARIUM",15],["LUCKY CLOUD CAT",45],["PEACH BLOSSOM",90]]) {
    await game.getByRole("button", { name:`Preview ${name}` }).click();
    await game.getByRole("button", { name:`BUY · ${price} FLIP`,exact:true }).click();
    await game.getByRole("button", { name:"EQUIP",exact:true }).click();
    const spot = name === "JELLY AQUARIUM" ? "LEFT CORNER" : name === "LUCKY CLOUD CAT" ? "RIGHT CORNER" : "FRONT RIGHT";
    await game.getByRole("button", { name:`Place at ${spot}`,exact:true }).click();
    await game.getByRole("button", { name:"PLACE HERE",exact:true }).click();
    await game.getByRole("button", { name:"SHOP",exact:true }).click();
  }
  await game.getByRole("button", { name:"Close shop" }).click();
  const scene = game.locator(".scene"), editor = game.locator(".room-layout-editor");
  const positions = async () => JSON.parse(await scene.getAttribute("data-room-positions"));
  async function dragTo(name,id,target) {
    const handle = game.getByRole("button", { name:`Move ${name}` }), box = await handle.boundingBox();
    const area = await game.locator(".room-drag-surface").boundingBox();
    const start = (await positions())[id] ?? defaults[id];
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + (target.x-start.x)/960*area.width, box.y + box.height / 2 + (target.y-start.y)/540*area.height, { steps:8 });
    await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(80);
  }
  await game.getByRole("button", { name:"EDIT ROOM",exact:true }).click();
  const canvas = game.locator(".scene canvas"), playerX = await canvas.getAttribute("data-player-x");
  await page.keyboard.down("d"); await page.waitForTimeout(100); await page.keyboard.up("d");
  assert.equal(await canvas.getAttribute("data-player-x"),playerX,"Editing must pause player movement");
  await dragTo("JELLY AQUARIUM","aquarium",{ x:260,y:340 });
  assert.deepEqual((await positions()).aquarium,{ x:260,y:340 });
  await dragTo("JELLY AQUARIUM","aquarium",{ x:480,y:250 });
  assert.deepEqual((await positions()).aquarium,{ x:260,y:340 },"Dropping on the table must revert the move");
  await dragTo("JELLY AQUARIUM","aquarium",{ x:713,y:363 });
  assert.deepEqual((await positions()).aquarium,{ x:260,y:340 },"Overlapping another decoration must be rejected");
  await game.getByRole("button", { name:"SAVE LAYOUT",exact:true }).click(); await editor.waitFor({ state:"hidden" });
  await game.getByRole("button", { name:"EDIT ROOM",exact:true }).click();
  await dragTo("JELLY AQUARIUM","aquarium",{ x:280,y:360 });
  await game.getByRole("button", { name:"CANCEL",exact:true }).click();
  assert.deepEqual((await positions()).aquarium,{ x:260,y:340 },"Cancel must restore the saved layout");
  await game.getByRole("button", { name:"EDIT ROOM",exact:true }).click();
  await game.getByRole("button", { name:"Move JELLY AQUARIUM" }).focus(); await page.keyboard.press("ArrowRight");
  assert.deepEqual((await positions()).aquarium,{ x:264,y:340 });
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-room-edit.png") });
  await game.getByRole("button", { name:"SAVE LAYOUT",exact:true }).click();
  await page.setViewportSize({ width:390,height:844 });
  await game.getByRole("button", { name:"EDIT ROOM",exact:true }).click();
  const handle = game.getByRole("button", { name:"Move JELLY AQUARIUM" }), box = await handle.boundingBox();
  const area = await game.locator(".room-drag-surface").boundingBox();
  const x = box.x+box.width/2,y=box.y+box.height/2;
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent",{ type:"touchStart",touchPoints:[{ x,y }] });
  await session.send("Input.dispatchTouchEvent",{ type:"touchMove",touchPoints:[{ x:x+36/960*area.width,y:y+30/540*area.height }] });
  await page.waitForTimeout(80);
  await session.send("Input.dispatchTouchEvent",{ type:"touchEnd",touchPoints:[] });
  await page.waitForTimeout(80);
  assert.deepEqual((await positions()).aquarium,{ x:300,y:370 },"Real touch drag must move the decoration");
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-room-edit-mobile.png") });
  await game.getByRole("button", { name:"SAVE LAYOUT",exact:true }).click();
  await game.getByRole("button", { name:"SHOP",exact:true }).click();
  await game.getByRole("button", { name:"COSTUME",exact:true }).click();
  for (const [name,price] of [["ROYAL CROWN",75],["PRISM WINGS",25]]) {
    await game.getByRole("button", { name:`Preview ${name}` }).click();
    await game.getByRole("button", { name:`BUY · ${price} FLIP`,exact:true }).click();
    await game.getByRole("button", { name:"EQUIP",exact:true }).click();
  }
  await game.getByRole("button", { name:"Close shop" }).click();
  await page.setViewportSize({ width:1280,height:800 }); await page.waitForTimeout(300);
  assert.deepEqual(JSON.parse(await scene.getAttribute("data-costumes")),{ HEAD:"royal-crown",WINGS:"wings" });
  assert.deepEqual((await positions()).aquarium,{ x:300,y:370 },"Saved placement must survive reopening the shop");
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-costumes-live.png") });
  const second = await openGame();
  await second.game.getByRole("button", { name:"SHOP",exact:true }).click(); await second.game.getByRole("button", { name:"COSTUME",exact:true }).click();
  for (const [name,price] of [["ROYAL CROWN",75],["ARCANE HAT",55],["MINT SKATEBOARD",35],["PRISM WINGS",25]]) {
    await second.game.getByRole("button", { name:`Preview ${name}` }).click(); await second.game.getByRole("button", { name:`BUY · ${price} FLIP`,exact:true }).click(); await second.game.getByRole("button", { name:"EQUIP",exact:true }).click();
  }
  await second.game.getByRole("button", { name:"Close shop" }).click();
  assert.deepEqual(JSON.parse(await second.game.locator(".scene").getAttribute("data-costumes")),{ HEAD:"arcane-hat",FEET:"skateboard",WINGS:"wings" },"Headpieces replace each other, not other accessory slots");
  const secondCanvas=second.game.locator(".scene canvas");
  await secondCanvas.click({ position:{ x:480,y:320 } }); await second.page.keyboard.down("d"); await second.page.waitForTimeout(160); await second.page.keyboard.up("d");
  assert(Number(await secondCanvas.getAttribute("data-player-x"))>480,"Equipped character must remain movable");
  await second.page.waitForTimeout(300); await second.page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-costumes-skateboard.png") });
  await second.game.getByRole("button", { name:/INTERACT/ }).click(); await second.page.waitForTimeout(150);
  await second.page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-costumes-table.png") });
  const third = await openGame();
  await third.game.getByRole("button", { name:"SHOP",exact:true }).click();
  await third.game.getByRole("button", { name:"COSTUME",exact:true }).click();
  for (const [name,price] of [["CLOUD BEANIE",60],["MINT SKATEBOARD",35],["PRISM WINGS",25],["ROYAL AURA",100]]) {
    await third.game.getByRole("button", { name:`Preview ${name}` }).click();
    await third.game.getByRole("button", { name:`BUY · ${price} FLIP`,exact:true }).click();
    await third.game.getByRole("button", { name:"EQUIP",exact:true }).click();
  }
  await third.game.getByRole("button", { name:"Close shop" }).click();
  assert.deepEqual(JSON.parse(await third.game.locator(".scene").getAttribute("data-costumes")),{ HEAD:"beanie",FEET:"skateboard",WINGS:"wings",AURA:"aura" });
  await third.page.waitForTimeout(500);
  await third.page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-costumes-all.png") });
  assert.deepEqual(errors,[]);
  console.log("PASS: mouse/touch drag, placement guards, pause, save/cancel, equipped costumes, slot replacement and live movement.");
} finally { await browser.close(); }
