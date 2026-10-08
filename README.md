# Rare Flip

Pixel coin-flip game built as a standalone FriendSDK v0.1.4 project.

For a fresh computer, see [CONTINUE.md](CONTINUE.md) and run `scripts/setup-new-pc.ps1`. Required artwork and sound source are included; keep this project separate from the other games.

## Exact demo economy

- Pick **HEADS** or **TAILS**.
- Each flip costs **2,000–100,000 RF**, in **2,000 RF** steps. One roll settles the entire wager.
- WIN chance: **50%**. Gross return: **2x the wager**. Fee: **8% of the original wager**, deducted on a win only. Net redeemable return: **1.92x the wager** (100,000 RF pays 192,000 RF).
- LOSE chance: **50%**. Return: **0 RF**.
- Expected return: **96% of the wager (96% RTP / 4% edge)**.
- Local preview starts with **200,000 simulated RF**. The project-owned variable-bet ledger is injected by the preview build script, without editing FriendSDK. This is local preview only; no real RF or transaction is used. SDK live/on-chain variable-bet support is not configured.

## Run

Public no-wallet gameplay tester: `/demo.html` on the published site. This separate entry uses explicitly labelled recorded sample artwork, the same game UI and simulated variable-wager ledger, starts with 200,000 sample RF, and offers RESET DEMO. It neither connects to a wallet nor reads RPC; its CSP blocks all network connections. The normal `/` SDK wallet/owned-Friend gate is unchanged. Build the full site with `node scripts/build-site.mjs build`. For automated local verification, run `node scripts/build-demo.mjs .friendsdk/demo` then `node scripts/test-no-wallet-demo.mjs` (this starts its own temporary static server; the SDK server does not serve non-SDK entrypoints). All demo balances/shop data reset with the page or RESET DEMO.

```powershell
pnpm install
pnpm check
pnpm test
pnpm dev
```

The FriendSDK host still owns wallet connection, owned-Friend selection, sandboxing and action confirmations. Live/on-chain behavior is intentionally not configured.

Room exploration covers the clear floor on both sides (logical horizontal bounds 82–878). Machines, stools, coin cabinets, plants, foreground columns, the central table, rope posts and equipped decorations remain collision obstacles. Mouse/tap targets and keyboard/dpad movement share the same floor rules. `node scripts/capture-navigation.mjs` verifies widened side-floor access and mobile touch movement.

The Friend has short English pixel thought bubbles: idle chatter after 18–30 seconds without movement, thinking after choosing a side, and result dialogue after WIN/LOSE. Rewards of at least 50,000 RF use the big-win set. Every third consecutive loss suggests a rest, with no loss-chasing claims. Bubbles last four seconds and pause with game overlays. Original synthesized chiptune music and button/coin/WIN/LOSE sound cues require an initial game gesture; MUSIC and SFX have independent toggles. Audio suspends during host pause or a hidden page, and is disposed on unmount. No audio download or third-party music is used. `node scripts/capture-thoughts-sound.mjs` verifies these flows using simulated plays and observed Web Audio scheduling.

## Cosmetic shop prototype

The room HUD stacks RF above FLIP in one fixed-size wallet frame. RULES explains the earning rate: 2,000 RF wagered = 1 FLIP, on both WIN and LOSE, credited once per settled play from the original wager before fees. Claims and winnings grant no extra FLIP. `node scripts/capture-flip-balance.mjs` verifies wallet synchronization and desktop/mobile rules layout. Preview shop credit and purchases remain simulated and session-only; this does not implement persistent or on-chain FLIP accounting.

LIVE PREVIEW now shares `scene-renderer.ts` with the playable room, using the actual selected Friend sprite, current player/pet pose, equipped slots and saved decoration coordinates. Selected unowned/unequipped items are staged without changing inventory; costume selection replaces only its matching slot. The camera zooms all objects uniformly (never scales items independently). Effects animate with the same scene renderer; TEST WIN EFFECT is cosmetic only, spends nothing and makes no play request. Host pause freezes the preview clock, reduced motion uses the same static frames as the room. `node scripts/capture-live-preview.mjs` compares all 19 items' actual draw dimensions/coordinates against the playable room and checks animation/mobile layout.

PET artwork v2 keeps the mint slime, peach/cream fox with mint tail tip, violet moon bat and teal/gold star dragon concepts but simplifies silhouettes and details. The shop and room share a cached coarse native sprite (16 pixels wide for slime, 18 for fox/dragon and 20 for bat), drawn nearest-neighbor without smoothing or pixel readback. Playable dimensions, prices, following, bobbing and mirroring are unchanged; original v1 PNGs remain available.

After the SDK wallet/Friend gate, every new game session opens “What room do you want to RARE FLIP?”. Choose CLASSIC ROOM, DARKROOM or GALAXYROOM, then ENTER ROOM. Darkroom is an asymmetric vaulted cellar with entrance stairs, candle alcoves and a raised lounge. Galaxyroom is a circular observatory deck with panorama windows, navigation console and telescope. These are distinct background structures, not recolors. Movement boundaries and decoration placement account for the chosen layout (Galaxyroom front presets move inward). Shop preview uses the selected background. The room/table is drawn before the Friend; collision prevents entering the solid table. No opaque room slice is redrawn over the Friend. Room choice does not affect odds, wagers, fees or shop prices; reload returns to room selection. `node scripts/capture-rooms.mjs` verifies all themes and mobile selection using simulated plays only.

`node scripts/capture-character-visibility.mjs` checks all three rooms at the front table edge and while walking, flipping, animating WIN/LOSE and displaying on mobile, with skateboard, aura and pet equipped. It observes actual canvas draw order and rejects any room-image repaint after the Friend sprite, preventing the older foreground-crop regression.

ROOM includes the original three props plus GOLD TROPHY (60 FLIP), FRIEND STATUE (75 FLIP) and RETRO RADIO (45 FLIP). PET adds MINT SLIME (105), CLOUD FOX (180), MOON BAT (225) and STAR DRAGON (300 FLIP): three times skateboard (35), beanie (60), crown (75) and aura (100) respectively. One cosmetic pet can be equipped alongside other accessories; it follows the Friend's recorded movement trail, turns horizontally and bobs/hovers while idle. PET's DEMO +500 FLIP button adds simulated shop credit only. Art uses the same transparent PNGs in shop and room. `node scripts/capture-pets-decor.mjs` checks buying, equipping, movement, placement and touch layout.

The preview shop starts with 250 sample FLIP, separate from RF, and adds wager-based FLIP as described above. EQUIP on an owned room decoration opens a six-preset placement picker in the real room. Select a numbered spot for a staged live preview, then PLACE HERE to confirm; CANCEL restores the previous layout and returns to the shop without losing ownership. Occupied spots and the player's footprint are blocked. EQUIP ALL fills available positions without moving existing decorations. REMOVE ALL does not delete ownership. Equipped props appear in the playable room with depth ordering and floor collision. EDIT ROOM still allows mouse/touch dragging or arrow-key placement; SAVE LAYOUT commits changes and CANCEL restores the previous layout. Placement guards reject the table, outside-floor positions and overlapping props/player. `node scripts/capture-placement.mjs` verifies the preset picker on desktop and touch screens.

Costumes now render on the playable Friend and follow movement, idle bobbing and result animations. Headwear shares one HEAD slot; skateboard, wings and aura use separate slots and can be combined. Effects use one independent EFFECTS slot: rising hearts, an orbiting moon, or idle confetti with an extra burst on WIN. They follow the Friend, pause with the scene and respect reduced motion. Inventory and room placement persist while opening/closing the shop in the same game session, not across page reloads. `node scripts/capture-shop.mjs`, `node scripts/capture-room-edit.mjs` and `node scripts/capture-effects.mjs` verify these flows and capture the real local preview.
