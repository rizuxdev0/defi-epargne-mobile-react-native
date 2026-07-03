export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  defaultPosition: "before" | "after";
}

export const CURRENCIES: Currency[] = [
  { code: "XOF", symbol: "F CFA", name: "Franc CFA BCEAO", flag: "🇹🇬", defaultPosition: "after" },
  { code: "XAF", symbol: "F CFA", name: "Franc CFA BEAC", flag: "🇨🇲", defaultPosition: "after" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺", defaultPosition: "after" },
  { code: "USD", symbol: "$", name: "Dollar américain", flag: "🇺🇸", defaultPosition: "before" },
  { code: "GBP", symbol: "£", name: "Livre sterling", flag: "🇬🇧", defaultPosition: "before" },
  { code: "CAD", symbol: "C$", name: "Dollar canadien", flag: "🇨🇦", defaultPosition: "before" },
  { code: "CHF", symbol: "CHF", name: "Franc suisse", flag: "🇨🇭", defaultPosition: "after" },
  { code: "GHS", symbol: "₵", name: "Cedi ghanéen", flag: "🇬🇭", defaultPosition: "before" },
  { code: "NGN", symbol: "₦", name: "Naira nigérian", flag: "🇳🇬", defaultPosition: "before" },
  { code: "MAD", symbol: "DH", name: "Dirham marocain", flag: "🇲🇦", defaultPosition: "after" },
  { code: "DZD", symbol: "DA", name: "Dinar algérien", flag: "🇩🇿", defaultPosition: "after" },
  { code: "TND", symbol: "DT", name: "Dinar tunisien", flag: "🇹🇳", defaultPosition: "after" },
  { code: "KES", symbol: "KSh", name: "Shilling kenyan", flag: "🇰🇪", defaultPosition: "before" },
  { code: "ZAR", symbol: "R", name: "Rand sud-africain", flag: "🇿🇦", defaultPosition: "before" },
  { code: "EGP", symbol: "E£", name: "Livre égyptienne", flag: "🇪🇬", defaultPosition: "before" },
  { code: "GMD", symbol: "D", name: "Dalasi gambien", flag: "🇬🇲", defaultPosition: "after" },
  { code: "SLL", symbol: "Le", name: "Leone sierra-léonais", flag: "🇸🇱", defaultPosition: "before" },
  { code: "MGA", symbol: "Ar", name: "Ariary malgache", flag: "🇲🇬", defaultPosition: "after" },
  { code: "MZN", symbol: "MT", name: "Metical mozambicain", flag: "🇲🇿", defaultPosition: "after" },
  { code: "BIF", symbol: "FBu", name: "Franc burundais", flag: "🇧🇮", defaultPosition: "after" },
  { code: "RWF", symbol: "FRw", name: "Franc rwandais", flag: "🇷🇼", defaultPosition: "after" },
  { code: "UGX", symbol: "USh", name: "Shilling ougandais", flag: "🇺🇬", defaultPosition: "before" },
  { code: "TZS", symbol: "TSh", name: "Shilling tanzanien", flag: "🇹🇿", defaultPosition: "before" },
  { code: "ETB", symbol: "Br", name: "Birr éthiopien", flag: "🇪🇹", defaultPosition: "before" },
  { code: "CDF", symbol: "FC", name: "Franc congolais", flag: "🇨🇩", defaultPosition: "after" },
  { code: "CVE", symbol: "$", name: "Escudo cap-verdien", flag: "🇨🇻", defaultPosition: "after" },
  { code: "AOA", symbol: "Kz", name: "Kwanza angolais", flag: "🇦🇴", defaultPosition: "after" },
  { code: "BWP", symbol: "P", name: "Pula botswanais", flag: "🇧🇼", defaultPosition: "before" },
  { code: "JPY", symbol: "¥", name: "Yen japonais", flag: "🇯🇵", defaultPosition: "before" },
  { code: "CNY", symbol: "¥", name: "Yuan chinois", flag: "🇨🇳", defaultPosition: "before" },
  { code: "INR", symbol: "₹", name: "Roupie indienne", flag: "🇮🇳", defaultPosition: "before" },
  { code: "BRL", symbol: "R$", name: "Réal brésilien", flag: "🇧🇷", defaultPosition: "before" },
  { code: "AUD", symbol: "A$", name: "Dollar australien", flag: "🇦🇺", defaultPosition: "before" },
];

export function findCurrency(code: string): Currency | undefined {
  return CURRENCIES.find((c) => c.code === code);
}
