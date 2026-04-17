import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

const STORAGE_KEY = 'gm.recentlyViewed';
const MAX_ITEMS = 12;

const RecentlyViewedContext = createContext(null);

const readStored = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch {
        return [];
    }
};

export const RecentlyViewedProvider = ({ children }) => {
    const [ids, setIds] = useState(() => readStored());

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        } catch {}
    }, [ids]);

    const add = useCallback((productId) => {
        if (productId == null) return;
        setIds((prev) => {
            const next = [productId, ...prev.filter((x) => x !== productId)];
            return next.slice(0, MAX_ITEMS);
        });
    }, []);

    const clear = useCallback(() => setIds([]), []);

    const value = useMemo(() => ({ ids, add, clear }), [ids, add, clear]);

    return (
        <RecentlyViewedContext.Provider value={value}>
            {children}
        </RecentlyViewedContext.Provider>
    );
};

export const useRecentlyViewed = () => {
    const ctx = useContext(RecentlyViewedContext);
    if (!ctx)
        throw new Error(
            'useRecentlyViewed must be used within RecentlyViewedProvider',
        );
    return ctx;
};
