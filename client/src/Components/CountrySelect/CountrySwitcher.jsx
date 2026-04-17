import React, { useEffect, useRef, useState } from 'react';
import { useCountry } from '../../contexts/CountryContext';
import { useCart } from '../../CartContext';
import s from './CountrySwitcher.module.scss';

const OPTIONS = [
    { code: 'KZ', flag: '🇰🇿', label: 'Казахстан', currency: '₸' },
    { code: 'RF', flag: '🇷🇺', label: 'Россия', currency: '₽' }
];

const CountrySwitcher = () => {
    const { country, setCountry } = useCountry();
    const { cart, clearCart } = useCart();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const currentOption = OPTIONS.find((opt) => opt.code === country) || OPTIONS[0];

    const handleSelect = (nextCode) => {
        setOpen(false);
        if (nextCode === country) return;
        if (cart.length > 0) {
            const ok = window.confirm(
                'При смене страны корзина будет очищена (в разных странах разные цены и валюта). Продолжить?'
            );
            if (!ok) return;
            clearCart();
        }
        setCountry(nextCode);
    };

    return (
        <div className={s.switcher} ref={ref}>
            <button type="button" className={s.trigger} onClick={() => setOpen((v) => !v)}>
                <span className={s.flag}>{currentOption.flag}</span>
                <span className={s.currency}>{currentOption.currency}</span>
                <span className={s.caret} aria-hidden="true">▾</span>
            </button>
            {open && (
                <div className={s.menu}>
                    {OPTIONS.map((opt) => (
                        <button
                            key={opt.code}
                            type="button"
                            className={`${s.option} ${opt.code === country ? s.optionActive : ''}`}
                            onClick={() => handleSelect(opt.code)}
                        >
                            <span className={s.flag}>{opt.flag}</span>
                            <span className={s.optionLabel}>{opt.label}</span>
                            <span className={s.optionCurrency}>{opt.currency}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CountrySwitcher;
