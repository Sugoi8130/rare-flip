# Rare Flip

- This is a standalone FriendSDK game. Do not edit sibling projects.
- Preserve the FriendSDK wallet and owned-Friend gate.
- Preview balances and outcomes are simulated unless an explicitly authorized deployment is configured.
- One wager costs 2,000–100,000 RF, in 2,000 RF steps. One roll settles the whole wager.
- Outcome weights are 5,000 bps WIN and 5,000 bps LOSE.
- A WIN returns 2x the bet gross, minus an 8% fee on the original bet; net is 1.92x the bet. Base units remain 2,000 RF / 3,840 RF net. No extra fee is charged on a loss.
- A LOSE pays 0 RF.
- Use bigint base units for every RF amount.
- Resume unsettled plays instead of buying another consumable.
- Pause input and animation while the host sets `paused`.
- Keep controls usable on touch screens and respect reduced-motion preferences.
- Do not add live signing, token transfer, approval, or on-chain behavior without explicit user authorization.
