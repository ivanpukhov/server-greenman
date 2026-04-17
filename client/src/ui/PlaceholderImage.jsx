import React, { useMemo } from 'react';
import styles from './PlaceholderImage.module.scss';

const GRADIENTS = [
    ['#e8f6ee', '#9fd7b6'],
    ['#dff1e6', '#72c595'],
    ['#cde9d6', '#4fb77c'],
    ['#e3f2ea', '#38a066'],
    ['#edf7f0', '#63bf84'],
    ['#d8ecdd', '#1fa150'],
    ['#eaf4ed', '#0e9a47'],
    ['#f1f9f4', '#9ad4ad'],
];

function hashString(str = '') {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

function LeafGlyph() {
    return (
        <svg
            className={styles.glyph}
            viewBox="0 0 120 120"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M100 20c-40 0-72 28-72 64 0 4 0 8 1 12 4-36 28-60 64-68l7-8zm-7 8C60 36 36 58 32 90c10-20 32-38 61-46l0-16z"
                fill="currentColor"
                opacity="0.38"
            />
            <path
                d="M32 92c0 0 18-42 66-56"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.4"
            />
        </svg>
    );
}

/**
 * Branded placeholder used wherever a product image would go.
 * Deterministic — same name → same gradient, across card/gallery/cart/order.
 * Pass `src` later to swap for a real image.
 */
export default function PlaceholderImage({
    name = '',
    src,
    alt,
    rounded = 'lg',
    aspect = '1/1',
    className = '',
    size = 'md',
}) {
    const { from, to, initial } = useMemo(() => {
        const h = hashString(name.toLowerCase());
        const [f, t] = GRADIENTS[h % GRADIENTS.length];
        return { from: f, to: t, initial: (name.trim()[0] || '•').toUpperCase() };
    }, [name]);

    if (src) {
        return (
            <div
                className={`${styles.root} ${styles[`rounded-${rounded}`]} ${className}`}
                style={{ aspectRatio: aspect }}
            >
                <img className={styles.img} src={src} alt={alt || name} loading="lazy" />
            </div>
        );
    }

    return (
        <div
            className={`${styles.root} ${styles[`rounded-${rounded}`]} ${styles[`size-${size}`]} ${className}`}
            style={{
                aspectRatio: aspect,
                backgroundImage: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
            }}
            role="img"
            aria-label={alt || name}
        >
            <div className={styles.glyphWrap} style={{ color: to }}>
                <LeafGlyph />
            </div>
            <div className={styles.initial}>{initial}</div>
        </div>
    );
}
