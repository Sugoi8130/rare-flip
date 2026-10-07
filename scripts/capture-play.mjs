import assert from "node:assert/strict";
import { chromium } from "playwright";
import { installFixture, createArtworkFixture } from "../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs";
import { resolve } from "node:path";

// Capture the locally running game with a read-only wallet/art fixture.
// The game's own preview ledger handles the flip and reward.
const origin = "http://127.0.0.1:4173";
const bet = Number(process.argv[2] || 2000);
assert(bet >= 2000 && bet <= 100000 && bet % 2000 === 0);
const betLabel = `FLIP COIN · ${bet.toLocaleString("en-US")} RF`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const fixture = await installFixture(page, origin, { artworkCall: await createArtworkFixture() });
try {
  await page.goto(origin);
  await page.getByRole("button", { name: /^Connect (wallet|Browser wallet)$/ }).click();
  await page.getByRole("button", { name: /^Friend #7730\b/ }).click();
  const game = page.frameLocator("iframe");
  await game.getByRole("button", { name: /INTERACT/ }).waitFor();
  await game.getByRole("button", { name: /INTERACT/ }).click();
  await game.getByRole("spinbutton", { name: "Bet amount in RF" }).fill(String(bet));
  await game.getByRole("button", { name: "HEADS", exact: true }).click();
  await page.waitForTimeout(450);
  await page.locator(".rf-game-frame").screenshot({ path: resolve("outputs/rare-flip-live-room.png") });
  const action = game.getByRole("button", { name: betLabel, exact: true });
  assert.equal(await action.isEnabled(), true, "Live local preview must have enough simulated RF");
  await action.click();
  for (const title of ["Buy coin flip", "Use coin flip"]) {
    await page.getByText(title, { exact: true }).waitFor();
    await page.getByRole("button", { name: "Confirm preview", exact: true }).click();
    await page.getByText(title, { exact: true }).waitFor({ state: "hidden" });
    console.log(`Confirmed simulated step: ${title}`);
  }
  await page.waitForTimeout(500);
  await page.locator(".rf-game-frame").screenshot({ path: resolve("outputs/rare-flip-live-flip.png") });
  await game.locator(".result-burst").waitFor();
  assert.equal((await game.getByTestId("balance").innerText()).replaceAll(",", ""), `${200000 - bet} RF`);
  await page.waitForTimeout(500);
  assert.match(await game.locator(".result-burst strong").innerText(), /^(WIN|LOSE)$/);
  await page.locator(".rf-game-frame").screenshot({ path: resolve("outputs/rare-flip-live-result.png") });
  const seen = new Set();
  for (let round = 0; round < 8; round++) {
    const outcome = await game.locator(".result-burst strong").innerText(); seen.add(outcome);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`outputs/rare-flip-result-${outcome.toLowerCase()}.png`) });
    if (seen.size === 2) break;
    // The SDK browser fixture fixes preview rolls at 1500 (WIN).
    // Change only this isolated test page's fixture roll to cover LOSE too.
    await page.evaluate(() => {
      const random = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = array => array instanceof Uint32Array && array.length === 1 ? (array[0] = 9999, array) : random(array);
    });
    if (outcome === "WIN") {
      await game.getByRole("button", { name: /^CLAIM / }).click();
      await page.getByRole("button", { name: "Confirm preview", exact: true }).click();
      await game.getByRole("button", { name: "NEXT ROUND", exact: true }).waitFor();
      if (round === 0) assert.equal((await game.getByTestId("balance").innerText()).replaceAll(",", ""), `${200000 - bet + bet * 192 / 100} RF`);
    }
    await game.getByRole("button", { name: outcome === "WIN" ? "NEXT ROUND" : "TRY AGAIN", exact: true }).click();
    await game.getByRole("button", { name: "HEADS", exact: true }).click();
    await game.getByRole("button", { name: betLabel, exact: true }).click();
    for (const title of ["Buy coin flip", "Use coin flip"]) { await page.getByText(title, { exact: true }).waitFor(); await page.getByRole("button", { name: "Confirm preview", exact: true }).click(); await page.getByText(title, { exact: true }).waitFor({ state: "hidden" }); }
    await game.locator(".result-burst").waitFor(); await page.waitForTimeout(500);
  }
  assert.equal(seen.size, 2, "Capture both outcomes from actual simulated plays");
  assert.deepEqual(fixture.errors, []);
  console.log("PASS: captured the running localhost game, interactive buttons, real preview flip and WIN/LOSE result.");
} catch (error) { await page.screenshot({ path: resolve("outputs/capture-debug.png") }); console.log(await page.locator("body").innerText()); throw error; } finally { await browser.close(); }
