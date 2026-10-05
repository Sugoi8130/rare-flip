import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildGame, createGameServer } from "@rarefriends/friendsdk/build";

const command = process.argv[2] ?? "dev";
if (!new Set(["dev", "build"]).has(command)) throw new Error("Usage: node scripts/preview.mjs dev|build");

const gameDirectory = resolve("games/rare-flip");
const outdir = resolve(".friendsdk/preview");
const build = await buildGame(gameDirectory, { outdir, watch: command === "dev" });

async function applyDemoBalance() {
  const runtimePath = resolve(outdir, "runtime.js");
  const source = await readFile(runtimePath, "utf8");
  if (/rfBalance:20000n\*[A-Za-z_$][\w$]*/.test(source)) return;
  const matches = source.match(/rfBalance:20n\*[A-Za-z_$][\w$]*/g) ?? [];
  if (matches.length !== 1) throw new Error(`Expected one FriendSDK preview balance, found ${matches.length}.`);
  await writeFile(runtimePath, source.replace(/rfBalance:20n\*([A-Za-z_$][\w$]*)/, "rfBalance:20000n*$1"));
}

await applyDemoBalance();
if (command === "build") {
  await build.close();
  console.log(`Built Rare Flip preview at ${outdir} with 20,000 simulated RF.`);
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
