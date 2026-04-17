import React from 'react';
import styles from './PricePill.module.scss';

const CURRENCY_LABEL = {
    KZT: '₸',
    RUB: '₽',
    USD: '$',
    EUR: '€',
};

function formatAmount(value, currency) {
    if (value == null || isNaN(Number(value))) return '—';
    const n = Number(value);
    try {
        return new Intl.NumberFormat(currency === 'RUB' ? 'ru-RU' : 'ru-KZ', {
            style: 'decimal',
            maximumFractionDigits: 0,
        }).format(n);
    } catch {
        return String(Math.round(n));
    }
}

/**
 * Canonical price display. Handles:
 *  - from-price prefix (when multiple variants)
 *  - old price strikethrough
 *  - currency symbol per region
 *  - size variants (sm/md/lg/xl)
 */
export default function PricePill({
    value,
    oldValue,
    currency = 'KZT',
    from = false,
    size = 'md',
    align = 'start',
    className = '',
}) {
    const symbol = CURRENCY_LABEL[currency] || currency;
    const main = formatAmount(value, currency);
    const old = oldValue != null ? formatAmount(oldValue, currency) : null;

    return (
        <div
            className={`${styles.root} ${styles[`size-${size}`]} ${styles[`align-${align}`]} ${className}`}
        >
            {from && <span className={styles.prefix}>от</span>}
            <span className={styles.main}>
                {main}
                <span className={styles.symbol}>{symbol}</span>
            </span>
            {old && (
                <span className={styles.old}>
                    {old}
                    <span className={styles.symbol}>{symbol}</span>
                </span>
            )}
        </div>
    );
}
