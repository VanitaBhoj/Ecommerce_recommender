/**
 * Eco-points: reward higher eco-score purchases.
 * Tune multipliers for your business rules (Phase 4).
 */
export function computeEcoPointsForOrder(lines) {
  let points = 0;
  for (const line of lines) {
    const qty = line.quantity;
    const eco = line.ecoScoreAtPurchase ?? 50;
    /** Base: eco tier * qty; bump for very green items */
    const tier = eco >= 85 ? 1.4 : eco >= 70 ? 1.1 : 0.9;
    points += Math.round(tier * eco * 0.05 * qty);
  }
  return Math.max(0, points);
}

/** 100 eco-points ~= $1 discount (example) */
export function ecoPointsToDiscountCents(pointsRedeemed) {
  return Math.floor(pointsRedeemed / 100) * 100;
}
