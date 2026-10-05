import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { testGame } from "@rarefriends/friendsdk/testing";
import { createGamePreview, parseChanceGame, expectedReward, RF } from "@rarefriends/friendsdk/game";

const directory = new URL(".", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const definition = parseChanceGame(JSON.parse(await readFile(new URL("game.json", import.meta.url), "utf8")));
assert.equal(definition.price, 2_000n * RF);
assert.equal(definition.outcomes[0].reward, 3_680n * RF);
assert.equal(definition.outcomes[0].chanceBps, 5_000);
assert.equal(definition.outcomes[1].chanceBps, 5_000);
assert.equal(expectedReward(definition), 1_840n * RF, "RTP phải là 92% của cược 2.000 RF");

for (const [draw, expected] of [[0, 1], [9_999, 2]]) {
  const preview = createGamePreview(definition, { stake: 40_000n * RF, rfBalance: 20_000n * RF, draw: () => draw });
  await preview.client.buy(1n); const [play] = await preview.client.play(1n); const settled = await preview.client.settle(play.id);
  assert.equal(settled.outcomeId, expected);
}

await testGame(directory, {
  width: 960,
  height: 800,
  screenshot: new URL("../../outputs/rare-flip-desktop.png", import.meta.url).pathname.replace(/^\/(.:)/, "$1"),
  check: async ({ page, game }) => {
    await game.getByRole("main", { name: "Rare Flip" }).waitFor();
    await game.getByRole("button", { name: /NGỬA/ }).click();
    await game.getByRole("button", { name: "TUNG XU · 2.000 RF", exact: true }).waitFor();
    assert.equal(await game.getByRole("button", { name: "TUNG XU · 2.000 RF", exact: true }).isDisabled(), true, "SDK fixture mặc định 20 RF không đủ cược; luồng kinh tế được kiểm tra bằng ledger 20.000 RF ở trên");
    await game.getByRole("button", { name: "RULES", exact: true }).click();
    await game.getByRole("dialog", { name: "RULES", exact: true }).waitFor();
    assert.match(await game.getByRole("dialog", { name: "RULES", exact: true }).innerText(), /8% · 320 RF/);
    await game.getByRole("button", { name: "Đóng RULES", exact: true }).click();
  },
});

await testGame(directory, {
  width: 390,
  height: 844,
  check: async ({ game }) => {
    await game.getByRole("main", { name: "Rare Flip" }).waitFor();
    const box = await game.locator(".rare-flip").boundingBox();
    assert(box && box.width <= 390 && box.width >= 320, "Game phải vừa màn hình điện thoại");
    await game.getByRole("button", { name: /SẤP/ }).tap();
    await game.getByRole("button", { name: "TUNG XU · 2.000 RF", exact: true }).waitFor();
  },
});

console.log("PASS Rare Flip: economy, WIN/LOSE flow, desktop and mobile touch layout.");
