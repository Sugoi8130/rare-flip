// Project-owned, preview-only ledger. SDK wallet/ownership/confirmation gates
// remain in the host. A quantity represents ONE wager, not independent flips.
export function createVariablePreview(definition, options) {
  let balance = options.rfBalance, stake = options.stake, consumables = 0n;
  let reserved = 0n, liability = 0n;
  const inventory = [0n, 0n], plays = [], wagerQuantities = {};
  const maxPrize = definition.outcomes[0].reward;
  const valid = q => { if (typeof q !== "bigint" || q < 1n || q > 50n) throw new Error("Choose a bet from 2,000 to 100,000 RF in steps of 2,000."); };
  const free = () => stake - reserved - liability;
  const snapshot = () => ({ mode: "preview", friendId: options.friendId, rfBalance: balance, consumables, stake, freeStake: free(), reservedPlays: reserved, rewardLiability: liability, inventory: [...inventory], plays: plays.map(p => ({ ...p })), wagerQuantities: { ...wagerQuantities } });
  const client = {
    mode: "preview", definition,
    read: async () => snapshot(),
    canBuy: async q => { valid(q); return balance >= definition.price * q && free() + definition.price * q >= maxPrize * q; },
    async buy(q) { valid(q); if (!(await client.canBuy(q))) throw new Error("Insufficient balance or reserve."); balance -= definition.price * q; stake += definition.price * q; consumables += q; reserved += maxPrize * q; },
    async play(q = 1n) { valid(q); if (plays.some(p => p.outcomeId === null)) throw new Error("Resume your pending flip first."); if (consumables < q) throw new Error("Insufficient consumables."); consumables -= q; const p = { id: BigInt(plays.length + 1), outcomeId: null }; plays.push(p); wagerQuantities[String(p.id)] = q; return [{ ...p }]; },
    async settle(id) { const p = plays.find(p => p.id === id); if (!p || p.outcomeId !== null) throw new Error("Invalid pending play."); let roll;
      if (options.draw) roll = options.draw(); else { const word = new Uint32Array(1); do { globalThis.crypto.getRandomValues(word); } while (word[0] >= 4294960000); roll = word[0] % 10000; }
      if (!Number.isInteger(roll) || roll < 0 || roll >= 10000) throw new Error("Invalid roll.");
      const q = wagerQuantities[String(id)]; p.outcomeId = roll < 5000 ? 1 : 2; reserved -= maxPrize * q; inventory[p.outcomeId - 1] += q; liability += definition.outcomes[p.outcomeId - 1].reward * q; return { ...p }; },
    async redeem(outcome, q) { if (typeof q !== "bigint" || q < 1n || q > 99n || outcome !== 1 || inventory[0] < q) throw new Error("Invalid reward claim."); const amount = maxPrize * q; inventory[0] -= q; liability -= amount; stake -= amount; balance += amount; },
  };
  return { client };
}
