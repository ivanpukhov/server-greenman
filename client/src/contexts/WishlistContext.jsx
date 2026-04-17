import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import axios from 'axios';
import { apiUrl } from '../config/api';
import { hasValidSiteSession, useAuth } from '../AuthContext.jsx';

const STORAGE_KEY = 'gm.wishlist';

const WishlistContext = createContext(null);

const readStored = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
    } catch {
        return [];
    }
};

const writeStored = (ids) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {}
};

const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const WishlistProvider = ({ children }) => {
    const { isAuthenticated } = useAuth() || { isAuthenticated: false };
    const [ids, setIds] = useState(() => readStored());
    const [items, setItems] = useState([]);
    const [hydrated, setHydrated] = useState(false);
    const mergedOnceRef = useRef(false);

    useEffect(() => {
        writeStored(ids);
    }, [ids]);

    const loadFromServer = useCallback(async () => {
        if (!hasValidSiteSession()) return;
        try {
            const { data } = await axios.get(apiUrl('/wishlist'), {
                headers: authHeaders(),
            });
            const next = data?.items || [];
            setItems(next);
            setIds(next.map((x) => x.productId));
            setHydrated(true);
        } catch {}
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            mergedOnceRef.current = false;
            setItems([]);
            setHydrated(false);
            return;
        }
        if (mergedOnceRef.current) {
            loadFromServer();
            return;
        }
        mergedOnceRef.current = true;
        const local = readStored();
        if (local.length === 0) {
            loadFromServer();
            return;
        }
        axios
            .post(
                apiUrl('/wishlist/merge'),
                { productIds: local },
                { headers: authHeaders() },
            )
            .then(({ data }) => {
                const next = data?.items || [];
                setItems(next);
                setIds(next.map((x) => x.productId));
                setHydrated(true);
            })
            .catch(() => loadFromServer());
    }, [isAuthenticated, loadFromServer]);

    const has = useCallback((productId) => ids.includes(Number(productId)), [ids]);

    const add = useCallback(
        async (productId) => {
            const pid = Number(productId);
            if (!pid) return;
            setIds((prev) => (prev.includes(pid) ? prev : [pid, ...prev]));
            if (hasValidSiteSession()) {
                try {
                    await axios.post(
                        apiUrl('/wishlist'),
                        { productId: pid },
                        { headers: authHeaders() },
                    );
                    loadFromServer();
                } catch {}
            }
        },
        [loadFromServer],
    );

    const remove = useCallback(
        async (productId) => {
            const pid = Number(productId);
            if (!pid) return;
            setIds((prev) => prev.filter((x) => x !== pid));
            setItems((prev) => prev.filter((x) => x.productId !== pid));
            if (hasValidSiteSession()) {
                try {
                    await axios.delete(apiUrl(`/wishlist/${pid}`), {
                        headers: authHeaders(),
                    });
                } catch {}
            }
        },
        [],
    );

    const toggle = useCallback(
        (productId) => (has(productId) ? remove(productId) : add(productId)),
        [has, add, remove],
    );

    const value = useMemo(
        () => ({ ids, items, hydrated, has, add, remove, toggle }),
        [ids, items, hydrated, has, add, remove, toggle],
    );

    return (
        <WishlistContext.Provider value={value}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => {
    const ctx = useContext(WishlistContext);
    if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
    return ctx;
};
