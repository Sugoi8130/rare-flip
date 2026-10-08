import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { testGame } from "@rarefriends/friendsdk/testing";
import { createGamePreview, parseChanceGame, expectedReward, RF } from "@rarefriends/friendsdk/game";
import { createVariablePreview } from "../../scripts/variable-preview.mjs";

const directory = new URL(".", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const definition = parseChanceGame(JSON.parse(await readFile(new URL("game.json", import.meta.url), "utf8")));
assert.equal(definition.price, 2_000n * RF);
assert.equal(definition.outcomes[0].reward, 3_840n * RF);
assert.equal(definition.outcomes[0].chanceBps, 5_000);
assert.equal(definition.outcomes[1].chanceBps, 5_000);
assert.equal(expectedReward(definition), 1_920n * RF, "RTP phải là 96% của cược 2.000 RF");

for (const [draw, expected] of [[0, 1], [9_999, 2]]) {
  const preview = createGamePreview(definition, { stake: 40_000n * RF, rfBalance: 20_000n * RF, draw: () => draw });
  await preview.client.buy(1n); const [play] = await preview.client.play(1n); const settled = await preview.client.settle(play.id);
  assert.equal(settled.outcomeId, expected);
}

for (const units of [1n, 5n, 25n, 50n]) {
  for (const roll of [0, 9999]) {
    const preview = createVariablePreview(definition, { friendId: 7730n, stake: 2_000_000n * RF, rfBalance: 200_000n * RF, draw: () => roll });
    await assert.rejects(preview.client.buy(0n)); await assert.rejects(preview.client.buy(51n));
    await preview.client.buy(units); const plays = await preview.client.play(units);
    assert.equal(plays.length, 1, "A variable wager must have one outcome, not multiple independent flips");
    const pending = await preview.client.read();
    assert.equal(pending.wagerQuantities[String(plays[0].id)], units);
    assert.equal(pending.rfBalance, (200_000n - 2000n * units) * RF);
    await assert.rejects(preview.client.play(units), "A pending flip must be resumed first");
    const settled = await preview.client.settle(plays[0].id);
    assert.equal(settled.outcomeId, roll === 0 ? 1 : 2);
    if (roll === 0) { await preview.client.redeem(1, units); assert.equal((await preview.client.read()).rfBalance, (200_000n + 1840n * units) * RF); }
    else assert.equal((await preview.client.read()).rfBalance, (200_000n - 2000n * units) * RF);
    assert.equal((await preview.client.read()).reservedPlays, 0n);
  }
}

await testGame(directory, {
  width: 960,
  height: 800,
  screenshot: new URL("../../outputs/rare-flip-desktop.png", import.meta.url).pathname.replace(/^\/(.:)/, "$1"),
  check: async ({ page, game }) => {
    await game.getByRole("button",{ name:"ENTER ROOM →",exact:true }).click();
    await game.getByRole("main", { name: "Rare Flip" }).waitFor();
    const canvas = game.locator(".scene canvas");
    await canvas.click({ position: { x: 480, y: 320 } });
    await page.keyboard.down("a");
    await page.waitForTimeout(250);
    await page.keyboard.up("a");
    assert(Number(await canvas.getAttribute("data-player-x")) < 470, "WASD phải di chuyển nhân vật");
    await page.keyboard.down("w"); await page.waitForTimeout(650); await page.keyboard.up("w");
    assert(Number(await canvas.getAttribute("data-player-y")) >= 331, "Nhân vật phải dừng ở cạnh bàn");
    await game.getByRole("button", { name: /INTERACT/ }).click();
    await page.waitForTimeout(80);
    assert.equal(await canvas.getAttribute("data-facing"), "down", "Rarefriend must face the viewer at the coin table");
    const bet = game.getByRole("spinbutton", { name: "Bet amount in RF" });
    await bet.fill("1999"); assert.equal(await game.locator(".primary-action").isDisabled(), true);
    await game.getByRole("button", { name: "Bet 100,000 RF", exact: true }).click(); assert.equal(await bet.inputValue(), "100000");
    await game.getByRole("button", { name: "Bet 2,000 RF", exact: true }).click();
    await game.getByRole("button", { name: "RULES", exact: true }).click();
    assert.match(await game.getByRole("dialog", { name: "RULES", exact: true }).innerText(), /3,840 RF/);
    await game.getByRole("button", { name: "Close RULES", exact: true }).click();
    await game.getByRole("button", { name: /HEADS/ }).click();
    await game.getByRole("button", { name: "FLIP COIN · 2,000 RF", exact: true }).waitFor();
    assert.equal(await game.getByRole("button", { name: "FLIP COIN · 2,000 RF", exact: true }).isDisabled(), true, "SDK fixture mặc định 20 RF không đủ cược; luồng kinh tế được kiểm tra bằng ledger 20.000 RF ở trên");
    await game.getByRole("button", { name: "RULES", exact: true }).click();
    await game.getByRole("dialog", { name: "RULES", exact: true }).waitFor();
    assert.match(await game.getByRole("dialog", { name: "RULES", exact: true }).innerText(), /8% of bet · 160 RF/);
    const beforePause = await canvas.getAttribute("data-player-x");
    await page.keyboard.down("d"); await page.waitForTimeout(120); await page.keyboard.up("d");
    assert.equal(await canvas.getAttribute("data-player-x"), beforePause, "Mở RULES phải chặn di chuyển");
    await game.getByRole("button", { name: "Close RULES", exact: true }).click();
    await game.getByRole("button", { name: /BACK TO ROOM/ }).click();
    assert.equal(await game.getByRole("button", { name: "HEADS", exact: true }).count(), 0, "Thoát bàn phải ẩn lựa chọn tung xu");
    await game.getByRole("button", { name: /INTERACT/ }).click();
  },
});

await testGame(directory, {
  width: 390,
  height: 844,
  screenshot: new URL("../../outputs/rare-flip-mobile.png", import.meta.url).pathname.replace(/^\/(.:)/, "$1"),
  check: async ({ page, game }) => {
    await game.getByRole("button",{ name:"ENTER ROOM →",exact:true }).click();
    await game.getByRole("main", { name: "Rare Flip" }).waitFor();
    const box = await game.locator(".rare-flip").boundingBox();
    assert(box && box.width <= 390 && box.width >= 320, "Game phải vừa màn hình điện thoại");
    const right = await game.getByRole("button", { name: "Move Right", exact: true }).boundingBox();
    assert(right);
    await page.mouse.move(right.x + right.width / 2, right.y + right.height / 2);
    await page.mouse.down(); await page.waitForTimeout(180); await page.mouse.up();
    assert(Number(await game.locator(".scene canvas").getAttribute("data-player-x")) > 490, "Giữ nút cảm ứng phải di chuyển Rare Friend");
    await game.getByRole("button", { name: /INTERACT/ }).tap();
    await game.getByRole("button", { name: /TAILS/ }).tap();
    await game.getByRole("button", { name: "FLIP COIN · 2,000 RF", exact: true }).waitFor();
  },
});

console.log("PASS Rare Flip: economy, WIN/LOSE flow, desktop and mobile touch layout.");
