export type NumberFormat = "space" | "comma" | "dot";
export type CurrencyPosition = "left" | "right"; // Match the Profile type: "left" | "right"

export function formatNumber(n: number, fmt: "fr" | "en" = "fr"): string {
  const rounded = Math.round(n);
  // 'fr' = space separator, 'en' = comma separator
  const sep = fmt === "fr" ? " " : ",";
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

export function formatMoney(
  amount: number,
  symbol: string,
  position: CurrencyPosition = "right",
  fmt: "fr" | "en" = "fr",
): string {
  const n = formatNumber(amount, fmt);
  return position === "left" ? `${symbol}${n}` : `${n} ${symbol}`;
}
