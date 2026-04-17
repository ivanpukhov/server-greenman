import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PlaceholderImage from './PlaceholderImage';
import PricePill from './PricePill';
import { useCountry } from '../contexts/CountryContext';
import { CURRENCIES, toDisplayPrice } from '../config/currency';
import {
    IconHeart,
    IconHeartFilled,
    IconShoppingBag,
    IconPlus,
    IconMinus,
} from '../icons';
import s from './ProductCard.module.scss';

const ProductCard = ({
    product,
    inCart,
    onAdd,
    onIncrement,
    onDecrement,
    wished = false,
    onToggleWish,
    to,
    variant = 'default',
}) => {
    const { t } = useTranslation();
    const { country } = useCountry();
    const currencyCode = CURRENCIES[country]?.code || 'KZT';

    const types = Array.isArray(product?.types) ? product.types : [];
    const prices = types.map((tp) => tp.price);
    const rawMin = prices.length ? Math.min(...prices) : 0;
    const displayMin = toDisplayPrice(rawMin, country);
    const hasMultipleTypes = types.length > 1;

    const isCompact = variant === 'compact';
    const href = to ?? `/product/${product.id}`;

    const stop = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleHeart = (e) => {
        stop(e);
        onToggleWish?.(product);
    };

    const handleAdd = (e) => {
        stop(e);
        onAdd?.(product);
    };

    const handleInc = (e) => {
        stop(e);
        onIncrement?.(product);
    };

    const handleDec = (e) => {
        stop(e);
        onDecrement?.(product);
    };

    return (
        <Link to={href} className={`${s.card} ${isCompact ? s.cardCompact : ''}`}>
            <div className={s.media}>
                <PlaceholderImage
                    name={product.name}
                    size={isCompact ? 'md' : 'lg'}
                    className={s.thumb}
                />
                {onToggleWish && (
                    <button
                        type="button"
                        className={`${s.heart} ${wished ? s.heartActive : ''}`}
                        onClick={handleHeart}
                        aria-label={
                            wished
                                ? t('wishlist.remove', 'Убрать из избранного')
                                : t('wishlist.add', 'В избранное')
                        }
                    >
                        {wished ? (
                            <IconHeartFilled size={18} stroke={1.8} />
                        ) : (
                            <IconHeart size={18} stroke={1.8} />
                        )}
                    </button>
                )}
            </div>

            <div className={s.body}>
                <h3 className={s.name} title={product.name}>
                    {product.name}
                </h3>
                {!isCompact && product.description && (
                    <p className={s.desc}>{product.description}</p>
                )}
            </div>

            <div className={s.footer}>
                <PricePill
                    value={displayMin}
                    currency={currencyCode}
                    from={hasMultipleTypes}
                    size={isCompact ? 'sm' : 'md'}
                />

                {inCart ? (
                    <div className={s.stepper}>
                        <button
                            type="button"
                            className={s.stepBtn}
                            onClick={handleDec}
                            aria-label={t('product.decrement', 'Убрать')}
                        >
                            <IconMinus size={16} stroke={2} />
                        </button>
                        <span className={s.count}>{inCart.quantity}</span>
                        <button
                            type="button"
                            className={s.stepBtn}
                            onClick={handleInc}
                            aria-label={t('product.increment', 'Ещё')}
                        >
                            <IconPlus size={16} stroke={2} />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className={s.addBtn}
                        onClick={handleAdd}
                        aria-label={t('product.add_to_cart')}
                    >
                        <IconShoppingBag size={18} stroke={1.8} />
                    </button>
                )}
            </div>
        </Link>
    );
};

export default ProductCard;
