import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CURRENCIES, toDisplayPrice, formatDisplayPrice } from '../config/currency';

const STORAGE_KEY = 'gm.country';

const CountryContext = createContext(null);

const readStoredCountry = () => {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        if (value === 'KZ' || value === 'RF') return value;
    } catch (_) {}
    return null;
};

export const CountryProvider = ({ children }) => {
    const [country, setCountryState] = useState(() => readStoredCountry() || 'KZ');
    const [hasChosen, setHasChosen] = useState(() => readStoredCountry() !== null);

    useEffect(() => {
        try {
            if (hasChosen) {
                localStorage.setItem(STORAGE_KEY, country);
            }
        } catch (_) {}
    }, [country, hasChosen]);

    const setCountry = useCallback((nextCountry) => {
        if (nextCountry !== 'KZ' && nextCountry !== 'RF') return;
        setCountryState(nextCountry);
        setHasChosen(true);
    }, []);

    const value = useMemo(() => ({
        country,
        setCountry,
        hasChosen,
        currency: CURRENCIES[country],
        isRf: country === 'RF',
        isKz: country === 'KZ'
    }), [country, hasChosen, setCountry]);

    return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
};

export const useCountry = () => {
    const ctx = useContext(CountryContext);
    if (!ctx) throw new Error('useCountry must be used within CountryProvider');
    return ctx;
};

export const useCurrency = () => useCountry().currency;

export const usePrice = (kztPrice) => {
    const { country } = useCountry();
    return toDisplayPrice(kztPrice, country);
};

export const useFormatPrice = () => {
    const { country } = useCountry();
    return (kztPrice) => formatDisplayPrice(kztPrice, country);
};
