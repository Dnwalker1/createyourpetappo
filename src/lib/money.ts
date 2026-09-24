export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// "$24–$29", dropping ".00" to keep the range short, as in the design.
export function formatRange([low, high]: [number, number]): string {
  const short = (c: number) => (c % 100 === 0 ? `$${c / 100}` : formatMoney(c));
  return low === high ? short(low) : `${short(low)}–${short(high)}`;
}

// 10% bundle discount, rounded to the cent.
export function discountCents(subtotalCents: number, rate: number): number {
  return Math.round(subtotalCents * rate);
}
