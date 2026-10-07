import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildGame, createGameServer } from "@rarefriends/friendsdk/build";
import { createVariablePreview } from "./variable-preview.mjs";

const command = process.argv[2] ?? "dev";
if (!new Set(["dev", "build"]).has(command)) throw new Error("Usage: node scripts/preview.mjs dev|build");

const gameDirectory = resolve("games/rare-flip");
const outdir = resolve(".friendsdk/preview");
const build = await buildGame(gameDirectory, { outdir, watch: command === "dev" });

async function applyDemoBalance() {
  const runtimePath = resolve(outdir, "runtime.js");
  const source = await readFile(runtimePath, "utf8");
  if (source.includes("const RareFlipVariablePreview=")) return;
  const pattern = /[A-Za-z_$][\w$]*\(([A-Za-z_$][\w$]*),\{friendId:([^,]+),stake:([^,]+),rfBalance:20n\*([A-Za-z_$][\w$]*)\}\)/g;
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`Expected one FriendSDK preview balance, found ${matches.length}.`);
  const updated = source.replace(pattern, "RareFlipVariablePreview($1,{friendId:$2,stake:2000000n*$4,rfBalance:200000n*$4})");
  await writeFile(runtimePath, `const RareFlipVariablePreview=${createVariablePreview.toString()};\n${updated}`);
}

await applyDemoBalance();
if (command === "build") {
  await build.close();
  console.log(`Built Rare Flip variable-bet preview at ${outdir} with 200,000 simulated RF.`);
} else {
  const server = createGameServer(outdir);
  server.listen(4173, "127.0.0.1", () => console.log("Rare Flip preview: http://127.0.0.1:4173/"));
  const stop = async () => {
    server.closeAllConnections();
    await new Promise(resolveClose => server.close(resolveClose));
    await build.close();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
