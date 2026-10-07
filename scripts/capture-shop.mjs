import assert from "node:assert/strict";
import { chromium } from "playwright";
import { installFixture, createArtworkFixture } from "../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs";
import { resolve } from "node:path";

const origin = "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const browserErrors = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  await installFixture(page, origin, { artworkCall: await createArtworkFixture() });
  await page.goto(origin);
  await page.getByRole("button", { name: /^Connect (wallet|Browser wallet)$/ }).click();
  await page.getByRole("button", { name: /^Friend #7730\b/ }).click();
  const game = page.frameLocator("iframe");
  async function equipRoom(spot) {
    await game.getByRole("button", { name:"EQUIP",exact:true }).click();
    await game.getByRole("button", { name:`Place at ${spot}`,exact:true }).click();
    await game.getByRole("button", { name:"PLACE HERE",exact:true }).click();
    await game.getByRole("button", { name:"SHOP",exact:true }).click();
  }
  await game.getByRole("button", { name: "SHOP", exact: true }).click();
  const shop = game.getByRole("dialog", { name: "FLIP SHOP" });
  await shop.waitFor();
  await game.getByRole("button", { name: "Preview LUCKY CLOUD CAT" }).click();
  await shop.locator(".item-sprite[data-loaded=true]").first().waitFor();
  await page.waitForTimeout(200);
  await page.locator(".rf-game-frame").screenshot({ path: resolve("outputs/rare-flip-shop-room.png") });
  await game.getByRole("button", { name: "BUY · 45 FLIP", exact: true }).click();
  assert.equal(await shop.locator(".flip-wallet strong").innerText(), "205");
  await equipRoom("RIGHT CORNER");
  await game.getByRole("button", { name:"Preview LUCKY CLOUD CAT" }).click();
  await game.getByRole("button", { name: "UNEQUIP", exact: true }).waitFor();
  // A second decoration must not replace the first; bulk equip only owns items.
  await game.getByRole("button", { name: "Preview JELLY AQUARIUM" }).click();
  await game.getByRole("button", { name: "BUY · 15 FLIP", exact: true }).click();
  await equipRoom("LEFT CORNER");
  assert.equal(await game.locator(".scene").getAttribute("data-decorations"), "cat,aquarium");
  await game.getByRole("button", { name: "UNEQUIP", exact: true }).click();
  assert.equal(await game.locator(".scene").getAttribute("data-decorations"), "cat", "Unequipping one prop must preserve the others");
  await equipRoom("LEFT CORNER");
  await game.getByRole("button", { name: "REMOVE ALL", exact: true }).click();
  assert.equal(await game.locator(".scene").getAttribute("data-decorations"), "");
  await game.getByRole("button", { name: "EQUIP ALL", exact: true }).click();
  assert.equal(await game.locator(".scene").getAttribute("data-decorations"), "aquarium,cat");
  await game.getByRole("button", { name: "Preview PEACH BLOSSOM" }).click();
  await game.getByRole("button", { name: "BUY · 90 FLIP", exact: true }).click();
  await game.getByRole("button", { name: "EQUIP ALL", exact: true }).click();
  assert.equal(await game.locator(".scene").getAttribute("data-decorations"), "aquarium,cat,blossom");
  assert.equal(await shop.locator(".flip-wallet strong").innerText(), "100");
  await page.waitForTimeout(200);
  const description = await shop.locator(".shop-preview p").boundingBox();
  const price = await shop.locator(".shop-price").boundingBox();
  assert(description && price && description.y + description.height <= price.y + 1, "Room controls must not overlap the description");
  await page.locator(".rf-game-frame").screenshot({ path: resolve("outputs/rare-flip-shop-room-all.png") });
  await game.getByRole("button", { name: "Close shop" }).click();
  await shop.waitFor({ state: "hidden" });
  await page.waitForTimeout(200);
  await page.locator(".rf-game-frame").screenshot({ path: resolve("outputs/rare-flip-room-decorated.png") });
  await game.getByRole("button", { name: "SHOP", exact: true }).click();
  await shop.waitFor();
  assert.equal(await shop.locator(".flip-wallet strong").innerText(), "100");
  assert.equal(await shop.locator(".shop-item").filter({ hasText: "PLACED" }).count(), 3);
  for (const [category, item, file] of [["COSTUME", "CLOUD BEANIE", "hat"], ["COSTUME", "PRISM WINGS", "wings"], ["COSTUME", "MINT SKATEBOARD", "costume"], ["COSTUME", "ROYAL CROWN", "crown"], ["COSTUME", "ARCANE HAT", "wizard"], ["COSTUME", "ROYAL AURA", "aura"], ["EFFECTS", "PARTY POP", "effects"]]) {
    await game.getByRole("button", { name: category, exact: true }).click();
    await game.getByRole("button", { name: `Preview ${item}` }).click();
    if (category === "COSTUME") assert.equal(await shop.locator(".shop-item").count(), 6);
    await page.waitForTimeout(200);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`outputs/rare-flip-shop-${file}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.locator(".rf-game-frame").screenshot({ path: resolve("outputs/rare-flip-shop-mobile.png") });
  assert.equal(await shop.evaluate(el => el.scrollWidth > el.clientWidth), false, "Shop must not overflow horizontally");
  await game.getByRole("button", { name: "Close shop" }).click();
  await shop.waitFor({ state: "hidden" });
  assert.deepEqual(browserErrors, [], "The shop must not cause browser runtime errors");
  console.log("PASS: live shop captures, category selection, preview purchase, equip and mobile layout.");
} finally { await browser.close(); }
