// Generate a weighted random list of installment amounts that sums to target.
export function generateRandomInstallments(
  target: number,
  min = 500,
  max = 10000,
): number[] {
  if (target <= 0) return [];

  // Weighted pool favoring small amounts; scaled to the chosen max.
  const buildPool = (m: number): number[] => {
    const denoms = [
      { value: Math.max(min, Math.round(m * 0.05)), w: 10 },
      { value: Math.max(min, Math.round(m * 0.1)), w: 15 },
      { value: Math.max(min, Math.round(m * 0.2)), w: 12 },
      { value: Math.max(min, Math.round(m * 0.25)), w: 6 },
      { value: Math.max(min, Math.round(m * 0.3)), w: 8 },
      { value: Math.max(min, Math.round(m * 0.5)), w: 12 },
      { value: Math.max(min, Math.round(m * 0.75)), w: 5 },
      { value: m, w: 10 },
    ];
    const pool: number[] = [];
    for (const d of denoms) {
      const v = Math.min(Math.max(d.value, min), m);
      for (let i = 0; i < d.w; i++) pool.push(v);
    }
    return pool;
  };

  const pool = buildPool(max);
  const amounts: number[] = [];
  let sum = 0;
  let guard = 0;

  while (sum < target && guard++ < 100000) {
    const remaining = target - sum;
    if (remaining < min) {
      // top-up last value
      if (amounts.length > 0) amounts[amounts.length - 1] += remaining;
      else amounts.push(remaining);
      sum = target;
      break;
    }
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    const pick = Math.min(candidate, remaining);
    amounts.push(pick);
    sum += pick;
  }

  // Fisher-Yates shuffle
  for (let i = amounts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [amounts[i], amounts[j]] = [amounts[j], amounts[i]];
  }
  return amounts;
}

export function generateRegularInstallments(target: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(target / count);
  const arr = Array(count).fill(base);
  const remainder = target - base * count;
  if (remainder > 0) arr[arr.length - 1] += remainder;
  return arr;
}
