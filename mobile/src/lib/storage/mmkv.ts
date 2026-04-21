type StorageValue = string | number | boolean;

type StorageLike = {
  getString: (key: string) => string | undefined;
  getBoolean: (key: string) => boolean | undefined;
  set: (key: string, value: StorageValue) => void;
  remove: (key: string) => void;
};

function createFallbackStorage(): StorageLike {
  const memory = new Map<string, string>();

  const getRaw = (key: string): string | null => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return memory.get(key) ?? null;
  };

  const setRaw = (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
    memory.set(key, value);
  };

  const removeRaw = (key: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
    memory.delete(key);
  };

  return {
    getString: (key) => getRaw(key) ?? undefined,
    getBoolean: (key) => {
      const value = getRaw(key);
      if (value == null) return undefined;
      return value === 'true';
    },
    set: (key, value) => {
      setRaw(key, String(value));
    },
    remove: (key) => {
      removeRaw(key);
    },
  };
}

function createStorage(): StorageLike {
  try {
    // Expo Go cannot initialize Nitro modules such as MMKV, so we lazy-load it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv') as {
      createMMKV?: (config: { id: string }) => StorageLike;
    };
    if (typeof createMMKV === 'function') {
      return createMMKV({ id: 'greenman' });
    }
  } catch {
    // Fall back below when MMKV is unavailable in the current runtime.
  }

  return createFallbackStorage();
}

export const storage = createStorage();

export const StorageKey = {
  Country: 'gm.country',
  CountryChosen: 'gm.country.chosen',
  Cart: 'gm.cart',
  Lang: 'gm.lang',
} as const;

export function getJSON<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJSON(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
