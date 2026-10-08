import assert from "node:assert/strict";
import { chromium } from "playwright";
import { resolve } from "node:path";
import { canWalkRoom } from "../games/rare-flip/room-navigation.ts";
import { installFixture, createArtworkFixture } from "../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs";

for (const [x,y] of [[170,335],[790,335],[110,320],[850,320]]) assert(canWalkRoom(x,y),"Side floor must be accessible");
for (const [x,y] of [[110,250],[850,250],[180,235],[780,235],[80,335],[880,335],[480,250],[160,380],[800,380]]) assert(!canWalkRoom(x,y),"Furniture and walls must remain solid");
const browser = await chromium.launch({ headless:true });
try {
  const page = await browser.newPage({ viewport:{ width:1280,height:800 },hasTouch:true });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await installFixture(page,"http://127.0.0.1:4173",{ artworkCall:await createArtworkFixture() });
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name:/^Connect (wallet|Browser wallet)$/ }).click();
  await page.getByRole("button", { name:/^Friend #7730\b/ }).click();
  await page.frameLocator("iframe").getByRole("button",{ name:"ENTER ROOM →",exact:true }).click();
  const game = page.frameLocator("iframe"),canvas = game.locator(".scene canvas");
  await game.getByRole("button", { name:/INTERACT/ }).waitFor();
  async function go(x,y,touch=false) {
    const box = await canvas.boundingBox();
    await canvas[touch ? "tap" : "click"]({ position:{ x:x/960*box.width,y:y/540*box.height } });
    await canvas.evaluate((element,target) => new Promise((resolve,reject) => {
      const started = performance.now();
      const poll = () => {
        if (Math.hypot(Number(element.dataset.playerX)-target.x,Number(element.dataset.playerY)-target.y)<7) resolve();
        else if (performance.now()-started>7000) reject(new Error(`Did not reach ${target.x},${target.y}: ${element.dataset.playerX},${element.dataset.playerY}`));
        else requestAnimationFrame(poll);
      }; poll();
    }),{ x,y });
  }
  await go(170,335);
  assert(Number(await canvas.getAttribute("data-player-x"))<190);
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-wide-room-left.png") });
  await go(790,335);
  assert(Number(await canvas.getAttribute("data-player-x"))>770);
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-wide-room-right.png") });
  await page.setViewportSize({ width:390,height:844 });
  await go(170,335,true);
  const pad = await game.getByRole("button", { name:"Move Left",exact:true }).boundingBox();
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent",{ type:"touchStart",touchPoints:[{ x:pad.x+pad.width/2,y:pad.y+pad.height/2 }] });
  await page.waitForTimeout(200);
  await session.send("Input.dispatchTouchEvent",{ type:"touchEnd",touchPoints:[] });
  assert(Number(await canvas.getAttribute("data-player-x"))<160,"Dpad must also reach expanded floor");
  const x = Number(await canvas.getAttribute("data-player-x")),y=Number(await canvas.getAttribute("data-player-y"));
  assert(canWalkRoom(x,y));
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-wide-room-mobile.png") });
  assert.deepEqual(errors,[]);
  console.log("PASS: widened floor on both sides, furniture/wall guards, real click movement and mobile touch navigation.");
} finally { await browser.close(); }
