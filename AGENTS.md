# Rare Flip

- This is a standalone FriendSDK game. Do not edit sibling projects.
- Preserve the FriendSDK wallet and owned-Friend gate.
- Preview balances and outcomes are simulated unless an explicitly authorized deployment is configured.
- One flip costs exactly 2,000 RF.
- Outcome weights are 5,000 bps WIN and 5,000 bps LOSE.
- A WIN has a gross 4,000 RF return, an 8% fee of 320 RF, and a net redeemable reward of 3,680 RF.
- A LOSE pays 0 RF.
- Use bigint base units for every RF amount.
- Resume unsettled plays instead of buying another consumable.
- Pause input and animation while the host sets `paused`.
- Keep controls usable on touch screens and respect reduced-motion preferences.
- Do not add live signing, token transfer, approval, or on-chain behavior without explicit user authorization.
