# Rare Flip

Pixel coin-flip game built as a standalone FriendSDK v0.1.4 project.

## Exact demo economy

- Pick **SẤP** or **NGỬA**.
- Each flip costs **2,000 RF**.
- WIN chance: **50%**. Gross return: **4,000 RF**. Fee: **8% = 320 RF**. Net redeemable return: **3,680 RF**.
- LOSE chance: **50%**. Return: **0 RF**.
- Expected return: **1,840 RF per flip (92% RTP / 8% edge)**.
- Local preview starts with **20,000 simulated RF** so the 2,000 RF stake can be tested. This is a project-local preview patch only; no real RF or transaction is used.

## Run

```powershell
pnpm install
pnpm check
pnpm test
pnpm dev
```

The FriendSDK host still owns wallet connection, owned-Friend selection, sandboxing and action confirmations. Live/on-chain behavior is intentionally not configured.
