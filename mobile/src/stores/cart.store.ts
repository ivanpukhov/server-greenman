import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, StorageKey } from '@/lib/storage/mmkv';

export type ProductTypeRef = {
  id: number;
  type: string;
  price: number;
};

export type CartItem = {
  productId: number;
  productName: string;
  image?: string;
  type: ProductTypeRef;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  remove: (productId: number, typeId: number) => void;
  updateQty: (productId: number, typeId: number, quantity: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

const mmkvAdapter = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.remove(name);
  },
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.type.id === item.type.id
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),

      remove: (productId, typeId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.type.id === typeId)
          ),
        })),

      updateQty: (productId, typeId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId && i.type.id === typeId
                ? { ...i, quantity: Math.max(1, quantity) }
                : i
            ),
        })),

      clear: () => set({ items: [] }),

      count: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      subtotal: () => get().items.reduce((acc, i) => acc + i.type.price * i.quantity, 0),
    }),
    {
      name: StorageKey.Cart,
      storage: createJSONStorage(() => mmkvAdapter),
    }
  )
);
