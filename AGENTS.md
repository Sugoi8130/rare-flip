# Rare Flip

- This is a standalone FriendSDK game. Do not edit sibling projects.
- SDK 1.0: preserve platform-supplied identity; never add in-game wallet connection or ownership discovery. The separate sample-art no-wallet tester is intentional.
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
- Use root friendsdk.json and SDK 1.0 connect/art/holdings/transact APIs. Live payments are disabled in sdk-client.ts. SDK payouts are automatic to the Friend wallet; standalone demo claims remain simulated.
