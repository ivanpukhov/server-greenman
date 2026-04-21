import { create } from 'zustand';
import { storage, StorageKey } from '@/lib/storage/mmkv';

export type Country = 'KZ' | 'RF';
export type Currency = 'KZT' | 'RUB';

type CountryState = {
  country: Country;
  hasChosen: boolean;
  currency: Currency;
  setCountry: (c: Country) => void;
  markChosen: () => void;
};

const initialCountry = (storage.getString(StorageKey.Country) as Country | undefined) ?? 'KZ';
const initialChosen = storage.getBoolean(StorageKey.CountryChosen) ?? false;

export const useCountryStore = create<CountryState>((set) => ({
  country: initialCountry,
  hasChosen: initialChosen,
  currency: initialCountry === 'RF' ? 'RUB' : 'KZT',

  setCountry: (c) => {
    storage.set(StorageKey.Country, c);
    set({ country: c, currency: c === 'RF' ? 'RUB' : 'KZT' });
  },

  markChosen: () => {
    storage.set(StorageKey.CountryChosen, true);
    set({ hasChosen: true });
  },
}));
