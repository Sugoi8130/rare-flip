# Continue Rare Flip on another computer

This is a standalone project. Keep it in its own folder; do not overlay Alien Angler, Rare Habitat or Sky Parcel Panic.

## Windows setup

Install Git and Node.js 24 (including npm). Clone this private repository using your own GitHub sign-in:

```powershell
git clone https://github.com/Sugoi8130/rare-flip.git
cd rare-flip
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-new-pc.ps1 -StartPreview
```

The script's execution-policy override is process-scoped, not a permanent system setting. It installs the pinned dependencies and Playwright Chromium, runs the checks/tests/build, and starts the preview on http://127.0.0.1:4173/. Without `-StartPreview`, it completes setup without starting a server. Port 4173 must be free; close any other game's preview using that port first.

## Current implementation

- PET artwork v2: simplified classic pixels, shared 16/18/20-pixel native sprites in room and shop; original concepts, prices and movement unchanged.
- Shop LIVE PREVIEW uses the same scene renderer and real Friend as gameplay, uniform detail camera, correct saved decoration placement and cosmetic TEST WIN EFFECT.

- Initial room chooser: Classic Room, Darkroom v2 (vaulted asymmetric cellar) and Galaxyroom v2 (circular orbital observatory); separate floor collision and synchronized shop background. Keep room selection after the SDK identity gate.

- FriendSDK v0.1.4; preserve wallet connection and owned-Friend selection.
- Variable simulated wagers 2,000–100,000 RF, WIN/LOSE 50/50. WIN pays 1.92x the original wager, including the 8% fee on the original wager only.
- Interactive pixel room, widened movement, animated Rarefriend, coin toss, WIN/LOSE banners and mobile controls.
- Sample FLIP shop: six decorations including trophy/statue/radio; six-preset placement picker after EQUIP; optional drag editor; headwear/skateboard/wings/aura; animated effects; four following cosmetic pets priced at 3x corresponding costumes, and PET-only demo credit top-up.
- English pixel thought bubbles: idle, thinking, WIN, rewards of at least 50,000 RF, LOSE and a rest after every third consecutive loss.
- Synthesized original chiptune music and click/coin/WIN/LOSE cues, separate MUSIC/SFX toggles, gesture unlock and host/visibility pause.

## Boundaries and known limitations

- This is a local preview, not live gambling. No token transfer, signing or on-chain deployment is configured.
- Shop starts with 250 sample FLIP. Each settled wager grants 1 FLIP per 2,000 RF on WIN and LOSE, once per play, with no extra credit for claiming winnings. Inventory, placements and preferences last only for the current session; they do not transfer to another machine or survive a reload. This remains simulated, not persistent on-chain accounting.
- All required artwork is versioned in `games/rare-flip/assets/`; exact generation prompts are included. Sound is synthesized in code, so no external audio files are required.
- Dependencies, generated preview files and screenshots are ignored. Each machine must run setup and create its own outputs.

## Verification and development

Run `pnpm check`, `pnpm test`, `pnpm build`. With `pnpm dev` running, the `scripts/capture-*.mjs` browser checks verify simulated gameplay, shop, costumes, effects, preset placement, dragging, widened navigation and thought/audio events. Captures go to `outputs/`.

Suggested instruction for a coding assistant:

> Continue Rare Flip in this repository. Read AGENTS.md, README.md and CONTINUE.md, inspect the working tree, run scripts/setup-new-pc.ps1, and use the existing source and artwork. Do not replace other games. Keep FriendSDK's wallet/owned-Friend gate and simulated economy unchanged unless I explicitly request otherwise.
