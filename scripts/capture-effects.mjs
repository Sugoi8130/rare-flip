import assert from "node:assert/strict";
import { chromium } from "playwright";
import { resolve } from "node:path";
import { installFixture, createArtworkFixture } from "../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs";

const origin = "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const fixture = await installFixture(page, origin, { artworkCall: await createArtworkFixture() });
  await page.goto(origin);
  await page.getByRole("button", { name: /^Connect (wallet|Browser wallet)$/ }).click();
  await page.getByRole("button", { name: /^Friend #7730\b/ }).click();
  await page.frameLocator("iframe").getByRole("button",{ name:"ENTER ROOM →",exact:true }).click();
  const game = page.frameLocator("iframe"), canvas = game.locator(".scene canvas");
  await game.getByRole("button", { name: "SHOP", exact: true }).waitFor();
  await page.waitForTimeout(700);
  const baseline = await canvas.screenshot();
  for (const [id, name, price] of [["hearts","HEART BUBBLES",40],["orbit","MOON ORBIT",65],["confetti","PARTY POP",120]]) {
    await game.getByRole("button", { name: "SHOP", exact: true }).click();
    await game.getByRole("button", { name: "EFFECTS", exact: true }).click();
    await game.getByRole("button", { name: `Preview ${name}` }).click();
    await game.getByRole("button", { name: `BUY · ${price} FLIP`, exact: true }).click();
    await game.getByRole("button", { name: "EQUIP", exact: true }).click();
    assert.match(await game.getByRole("button", { name: `Preview ${name}` }).innerText(), /EQUIPPED/);
    await game.getByRole("button", { name: "Close shop" }).click();
    await page.waitForTimeout(500);
    assert.equal(JSON.parse(await game.locator(".scene").getAttribute("data-costumes")).EFFECTS, id);
    const equipped = await canvas.screenshot();
    assert.notDeepEqual(equipped, baseline, `${name} must change actual canvas pixels, not only inventory state`);
    assert.deepEqual(equipped, await canvas.screenshot(), "Reduced motion must keep cosmetic particles still");
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`outputs/rare-flip-effect-${id}.png`) });
    await game.getByRole("button", { name: "SHOP", exact: true }).click();
    await game.getByRole("button", { name: "EFFECTS", exact: true }).click();
    await game.getByRole("button", { name: `Preview ${name}` }).click();
    await game.getByRole("button", { name: "UNEQUIP", exact: true }).click();
    await game.getByRole("button", { name: "Close shop" }).click();
    assert.deepEqual(await canvas.screenshot(), baseline, "Unequip must remove all effect pixels");
  }
  // Combine the effect slot with a headpiece and exercise replacement.
  await game.getByRole("button", { name: "SHOP", exact: true }).click();
  await game.getByRole("button", { name: "COSTUME", exact: true }).click();
  await game.getByRole("button", { name: "Preview PRISM WINGS" }).click();
  await game.getByRole("button", { name: "BUY · 25 FLIP", exact: true }).click();
  await game.getByRole("button", { name: "EQUIP", exact: true }).click();
  await game.getByRole("button", { name: "EFFECTS", exact: true }).click();
  for (const name of ["HEART BUBBLES","MOON ORBIT","PARTY POP"]) {
    await game.getByRole("button", { name: `Preview ${name}` }).click();
    await game.getByRole("button", { name: "EQUIP", exact: true }).click();
  }
  await game.getByRole("button", { name: "Close shop" }).click();
  assert.deepEqual(JSON.parse(await game.locator(".scene").getAttribute("data-costumes")), { EFFECTS:"confetti", WINGS:"wings" });
  await page.emulateMedia({ reducedMotion:"no-preference" });
  await page.waitForTimeout(200);
  const moving = await canvas.screenshot(); await page.waitForTimeout(250);
  assert.notDeepEqual(await canvas.screenshot(), moving);
  await game.getByRole("button", { name:/INTERACT/ }).click();
  await game.getByRole("button", { name:"HEADS", exact:true }).click();
  await game.getByRole("button", { name:"FLIP COIN · 2,000 RF", exact:true }).click();
  for (const title of ["Buy coin flip","Use coin flip"]) {
    await page.getByText(title, { exact:true }).waitFor();
    await page.getByRole("button", { name:"Confirm preview", exact:true }).click();
    await page.getByText(title, { exact:true }).waitFor({ state:"hidden" });
  }
  await game.locator(".result-burst").waitFor();
  assert.equal(await game.locator(".result-burst strong").innerText(), "WIN");
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-effect-confetti-win.png") });
  await page.setViewportSize({ width:390, height:844 });
  await page.locator(".rf-game-frame").screenshot({ path:resolve("outputs/rare-flip-effect-mobile.png") });
  assert.deepEqual(errors, []); assert.deepEqual(fixture.errors, []);
  console.log("PASS: all effects alter live canvas pixels; reduced motion, unequip, independent slot, replacement, animation, WIN party and mobile.");
} finally { await browser.close(); }
