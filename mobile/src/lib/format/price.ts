import type { Currency } from '@/lib/api/types';

const SYMBOL: Record<Currency, string> = { KZT: '₸', RUB: '₽' };

export function formatPrice(value: number, currency: Currency): string {
  const rounded = Math.round(value);
  const grouped = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped} ${SYMBOL[currency]}`;
}
