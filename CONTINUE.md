# Continue Rare Flip

Keep separate from Alien Angler, Rare Habitat and Sky Parcel Panic.

```powershell
git clone https://github.com/Sugoi8130/rare-flip.git
cd rare-flip
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-new-pc.ps1 -StartPreview
```

Install Git and Node.js 24 first. Setup installs pinned dependencies and Playwright, checks/tests/builds, then optionally starts the official SDK 1.0 simulator. Execution-policy override is process-scoped.

Read AGENTS.md and README.md. Root friendsdk.json is the manifest; games/rare-flip/client.tsx is the platform entry. Dependency is pinned to the new official SDK commit. Do not restore 0.1 wallet mocks, chain readers or CLI shims. The platform supplies identity/artwork. Live payments remain disabled; contracts and persistent cosmetic storage are not deployed.

Run pnpm dev (default 4173/4174) or pnpm dev --port 4180. Run pnpm check, pnpm test, pnpm build. Run node scripts/build-site.mjs build for GitHub Pages. Static demo.html remains wallet-free and simulated. It is separate from the platform paid-action adapter.

Shop progress resets each session. SDK payouts go automatically to the Friend wallet; standalone simulated demo keeps CLAIM. Resume pending payments by hash, never repurchase them.
