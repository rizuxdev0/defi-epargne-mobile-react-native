import { useApp } from "../services/AppContext";
import { formatMoney } from "../lib/format";

export function useMoneyFormatter() {
  const { profile } = useApp();
  const symbol = profile?.currency_symbol ?? "€";
  const position = profile?.currency_position ?? "right";
  const fmt = profile?.number_format ?? "fr";
  
  return (amount: number) => {
    return formatMoney(amount, symbol, position, fmt);
  };
}
