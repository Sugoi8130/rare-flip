import assert from "node:assert/strict";
import { chromium } from "playwright";
import { resolve } from "node:path";
import { installFixture, createArtworkFixture } from "../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs";
const browser=await chromium.launch({ headless:true });
try {
  const page=await browser.newPage({ viewport:{ width:1280,height:800 } });
  const errors=[]; page.on("pageerror",error=>errors.push(error.message));
  await page.addInitScript(() => {
    window.__audioLog=[]; window.__audioContexts=[];
    const Native=window.AudioContext;
    window.AudioContext=class extends Native {
      constructor(...args) { super(...args); window.__audioContexts.push(this); }
      createOscillator() { const voice=super.createOscillator(),start=voice.start.bind(voice); voice.start=(time)=>{ window.__audioLog.push({ frequency:voice.frequency.value,type:voice.type }); return start(time); }; return voice; }
    };
  });
  await installFixture(page,"http://127.0.0.1:4173",{ artworkCall:await createArtworkFixture() });
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button",{ name:/^Connect (wallet|Browser wallet)$/ }).click();
  await page.getByRole("button",{ name:/^Friend #7730\b/ }).click();
  const game=page.frameLocator("iframe"),bubble=game.locator(".friend-thought");
  await game.getByRole("button",{ name:"Background music",exact:true }).waitFor();
  const audioFrame=page.frames().find(frame=>frame.url().includes("game.html"));
  assert.equal(await audioFrame.evaluate(()=>window.__audioContexts.length),0,"No sound before a game gesture");
  await game.getByRole("button",{ name:/INTERACT/ }).click();
  await page.waitForTimeout(250);
  assert.equal(await audioFrame.evaluate(()=>window.__audioContexts[0].state),"running");
  assert((await audioFrame.evaluate(()=>window.__audioLog.length))>0);
  await game.getByRole("button",{ name:"Background music",exact:true }).click();
  assert.equal(await game.getByRole("button",{ name:"Background music",exact:true }).getAttribute("aria-pressed"),"false");
  await page.waitForTimeout(150);
  const count=await audioFrame.evaluate(()=>window.__audioLog.length); await page.waitForTimeout(500);
  assert.equal(await audioFrame.evaluate(()=>window.__audioLog.length),count,"Music OFF stops scheduling");
  await game.getByRole("button",{ name:"HEADS",exact:true }).click();
  await bubble.locator("span").waitFor(); assert.equal(await bubble.getAttribute("data-mood"),"thinking");
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-thinking.png") });
  await game.getByRole("spinbutton",{ name:"Bet amount in RF" }).fill("100000");
  async function flip() {
    await game.getByRole("button",{ name:/^FLIP COIN/ }).click();
    for (const title of ["Buy coin flip","Use coin flip"]) {
      await page.getByText(title,{ exact:true }).waitFor();
      await audioFrame.waitForFunction(()=>window.__audioContexts[0].state === "suspended",undefined,{ timeout:2000 });
      await page.getByRole("button",{ name:"Confirm preview",exact:true }).click();
      await page.getByText(title,{ exact:true }).waitFor({ state:"hidden" });
    }
    await game.locator(".result-burst").waitFor();
    await page.waitForTimeout(900);
  }
  await flip();
  assert.equal(await bubble.getAttribute("data-mood"),"big");
  const log=await audioFrame.evaluate(()=>window.__audioLog);
  assert(log.some(cue=>cue.frequency===1320),"Coin cue must play");
  assert(log.some(cue=>cue.frequency===1046.5),"WIN cue must play");
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-big-win-thought.png") });
  await game.getByRole("button",{ name:/^CLAIM / }).click();
  await page.getByRole("button",{ name:"Confirm preview",exact:true }).click();
  await game.getByRole("button",{ name:"NEXT ROUND",exact:true }).click();
  await page.evaluate(()=>{
    const native=crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues=array=>array instanceof Uint32Array && array.length===1 ? (array[0]=9999,array) : native(array);
  });
  await game.getByRole("spinbutton",{ name:"Bet amount in RF" }).fill("2000");
  for (let i=1;i<=3;i++) {
    await game.getByRole("button",{ name:"HEADS",exact:true }).click(); await flip();
    assert.equal(await game.locator(".result-burst strong").innerText(),"LOSE");
    assert.equal(await bubble.getAttribute("data-mood"),i===3 ? "rest" : "lose");
    if (i<3) await game.getByRole("button",{ name:"TRY AGAIN",exact:true }).click();
  }
  assert((await audioFrame.evaluate(()=>window.__audioLog)).some(cue=>cue.frequency===392),"LOSE cue must play");
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-rest-thought.png") });
  await game.getByRole("button",{ name:"Sound effects",exact:true }).click();
  const muted=await audioFrame.evaluate(()=>window.__audioLog.length);
  await game.getByRole("button",{ name:"TRY AGAIN",exact:true }).click();
  await game.getByRole("button",{ name:"HEADS",exact:true }).click();
  assert.equal(await audioFrame.evaluate(()=>window.__audioLog.length),muted,"SFX OFF suppresses button cues");
  await page.setViewportSize({ width:390,height:844 });
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-thought-mobile.png") });
  await game.getByRole("button",{ name:"Background music",exact:true }).click();
  await game.getByRole("button",{ name:"RULES",exact:true }).click();
  await game.getByRole("button",{ name:"Close RULES",exact:true }).click();
  await game.getByRole("button",{ name:"← BACK TO ROOM",exact:true }).click();
  await game.locator('.friend-thought[data-mood="idle"][data-visible="true"]').waitFor({ timeout:35000 });
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-idle-thought.png") });
  assert.deepEqual(errors,[]);
  console.log("PASS: gesture audio unlock, host pause/resume, music/SFX toggles, coin/WIN/LOSE synth cues, idle/thinking/big reward/three-loss dialogue and mobile.");
} finally { await browser.close(); }
