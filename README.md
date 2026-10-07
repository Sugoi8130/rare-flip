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

The shop uses 250 sample FLIP, separate from RF; RF-to-FLIP conversion is not connected yet. EQUIP on an owned room decoration opens a six-preset placement picker in the real room. Select a numbered spot for a staged live preview, then PLACE HERE to confirm; CANCEL restores the previous layout and returns to the shop without losing ownership. Occupied spots and the player's footprint are blocked. EQUIP ALL fills available positions without moving existing decorations. REMOVE ALL does not delete ownership. Equipped props appear in the playable room with depth ordering and floor collision. EDIT ROOM still allows mouse/touch dragging or arrow-key placement; SAVE LAYOUT commits changes and CANCEL restores the previous layout. Placement guards reject the table, outside-floor positions and overlapping props/player. `node scripts/capture-placement.mjs` verifies the preset picker on desktop and touch screens.

Costumes now render on the playable Friend and follow movement, idle bobbing and result animations. Headwear shares one HEAD slot; skateboard, wings and aura use separate slots and can be combined. Effects use one independent EFFECTS slot: rising hearts, an orbiting moon, or idle confetti with an extra burst on WIN. They follow the Friend, pause with the scene and respect reduced motion. Inventory and room placement persist while opening/closing the shop in the same game session, not across page reloads. `node scripts/capture-shop.mjs`, `node scripts/capture-room-edit.mjs` and `node scripts/capture-effects.mjs` verify these flows and capture the real local preview.
