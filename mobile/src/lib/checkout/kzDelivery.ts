import type { CartItem } from '@/stores/cart.store';

export type KzDelivery = 'kazpost' | 'indrive' | 'city';

const INDRIVE_CITIES = ['Щучинск', 'Кокшетау', 'Астана', 'Костанай'];
const PETROPAVLOVSK = 'Петропавловск';

export function isIndriveCity(city: string): boolean {
  return INDRIVE_CITIES.includes(city);
}

export function isCashCity(city: string): boolean {
  return city === PETROPAVLOVSK;
}

export function isCityDeliveryCity(city: string): boolean {
  return city === PETROPAVLOVSK;
}

export function isKazpostCity(city: string): boolean {
  return city !== '' && city !== PETROPAVLOVSK;
}

export function calcKzDelivery(method: KzDelivery, items: CartItem[]): number {
  if (method === 'kazpost') {
    const totalVolume = items.reduce((sum, item) => {
      const match = item.type.type.match(/\b\d+\b/);
      let volume = 1000;
      if (match && parseInt(match[0], 10) >= 300) volume = parseInt(match[0], 10);
      return sum + volume * item.quantity;
    }, 0);
    return 1800 + (totalVolume > 1000 ? Math.ceil((totalVolume - 1000) / 1000) * 400 : 0);
  }
  if (method === 'indrive') return 4000;
  if (method === 'city') return 1500;
  return 0;
}
