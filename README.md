# Rare Flip

Retro pixel coin-flip game on **FriendSDK 1.0.0**, pinned to `rarefriends/friendsdk@c19058711f3c207c67cd30b8136de89978f08ddd`.

## Play

[No-wallet gameplay demo](https://sugoi8130.github.io/rare-flip/demo.html): sample artwork, 200,000 simulated RF, RESET DEMO, desktop and touch controls. No wallet, RPC or real tokens. Static root redirects here; the 0.1 wallet host is no longer shipped.

Platform sessions use `connect()`, `game.friend`, `game.art`, `holdings()` and `transact()`. Only the platform selects/verifies Friends and owns payment confirmations. This version refuses live payments; owner deployment and separate authorization are required to enable them. GitHub Pages cannot supply platform sessions, Nakama or the keeper.

## Commands

Node.js 24. On Windows use `scripts/setup-new-pc.ps1`, or:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm dev
```

Dev runs the official simulated chain, Nakama emulator, keeper and fixture Friend picker, without wallets or Docker. Default ports 4173/4174; `pnpm dev --port 4180` for integration tests when the defaults are occupied.

`pnpm build` creates `.friendsdk/build/` with client, manifest, contract request and file hashes for platform review, not live deployment. `node scripts/build-site.mjs build` exports the standalone demo to `dist/` and host-only SDK client to `dist/sdk/`. GitHub Pages rebuilds on master pushes. The older Sites snapshot is not automatically updated.

## Economy and limitations

- Bets 2,000–100,000 RF, steps of 2,000. HEADS/TAILS; one draw per whole wager.
- WIN 50%, pays 1.92× original bet (2× gross less 8% of original bet). LOSE 50%, pays 0. Expected return 96%.
- Root friendsdk.json declares 50 distinct draws, quantity 1, two lanes of 25 to fit deployed module limits. Each lane requires its own owner-funded bankroll. No contracts are deployed here.
- SDK winnings go automatically to the Friend wallet; RF HUD holdings are the paying wallet balance. These wallets can differ. No manual CLAIM is sent in SDK sessions.
- Pending payments resume by transaction hash, including changed ids after placement. Unseen settled transactions can be resumed after reload; acknowledged results are not repurchased.
- Earn 1 FLIP per 2,000 RF wagered, both outcomes, once at settlement. Cosmetic inventory, FLIP and layouts remain session-only, starting with 250 sample FLIP; persistent server-backed progress is not implemented.
- The standalone demo deliberately keeps its simulated local ledger and CLAIM flow; neither sample artwork nor its id claims NFT ownership.

## Graphics

Classic Room, Darkroom and Galaxyroom, solid-black outlined Friend, walking and idle bobbing, animated toss and WIN/LOSE panels. Shared room/shop renderer; six decorations with preset/drag placement, headwear/skateboard/wings/aura, three effects and four following pets. English thoughts, original synthesized sound/music, pause and reduced motion. Assets/prompts in games/rare-flip/assets; recorded sample art in sample-art.ts.

## Verification

`pnpm test`: all wager declarations, demo economy, pending/hash/ack, duplicate prevention, live-payment guard, no-wallet desktop/mobile gameplay, FLIP, shop and reset.

`node scripts/test-sdk-host.mjs` with host at localhost:4180 (override RARE_FLIP_TEST_HOST): actual SDK dev host at 2K/10K/100K, WIN/LOSE, auto payout, FLIP and mobile.

`node scripts/test-no-wallet-demo.mjs --pages` after site build checks project-subpath assets. Obsolete 0.1 CLI tests/scripts were replaced; originals remain in Git history and v0.1.0-demo.
