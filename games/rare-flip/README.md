# Rare Flip game component

FriendSDK v0.1.4 game component. The host supplies the verified Rare Friend,
sandboxed client and action confirmations.

## Rules

| Rule | Exact value |
| --- | --- |
| Choice | HEADS or TAILS |
| Price | 2,000–100,000 RF, steps of 2,000 RF in the local preview |
| WIN | 50%; 2x bet gross less 8% of the original bet; 1.92x bet net reward |
| LOSE | 50%; 0 RF reward |
| Expected return | 96% of the bet (96% RTP) |
| Preview | Simulated RF and outcomes only |

The result table stores WIN/LOSE. On WIN the coin lands on the selected side;
on LOSE it lands on the opposite side. A pending play is resumed without a new
purchase. Live transactions and a deployment are not configured.
