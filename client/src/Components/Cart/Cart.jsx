import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../CartContext.jsx';
import { useCountry } from '../../contexts/CountryContext.jsx';
import { CURRENCIES, toDisplayPrice } from '../../config/currency';
import ScrollToTop from '../ScrollToTop';
import {
    Breadcrumbs,
    Button,
    EmptyState,
    PageContainer,
    PlaceholderImage,
    PricePill,
} from '../../ui';
import emptyCartIllu from '../../images/illustrations/empty-cart.svg';
import {
    IconArrowNarrowRight,
    IconMinus,
    IconPlus,
    IconShoppingBag,
    IconTrash,
} from '../../icons';
import s from './Cart.module.scss';

const truncate = (str, n = 80) =>
    str && str.length > n ? str.slice(0, n) + '…' : str || '';

const Cart = () => {
    const { t } = useTranslation();
    const { cart, removeFromCart, updateQuantity } = useCart();
    const { country } = useCountry();
    const navigate = useNavigate();
    const currencyCode = CURRENCIES[country]?.code || 'KZT';

    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
    const subtotalKzt = cart.reduce(
        (sum, i) => sum + i.type.price * i.quantity,
        0,
    );
    const subtotal = toDisplayPrice(subtotalKzt, country);

    if (cart.length === 0) {
        return (
            <PageContainer size="xl" className={s.page}>
                <ScrollToTop />
                <Helmet>
                    <title>{t('cart.seo_title')}</title>
                </Helmet>
                <Breadcrumbs
                    items={[
                        { label: t('common.home'), to: '/' },
                        { label: t('cart.title') },
                    ]}
                />
                <EmptyState
                    illustration={<img src={emptyCartIllu} alt="" style={{ width: 220 }} />}
                    title={t('cart.empty_title')}
                    description={t('cart.empty_text')}
                    actions={
                        <>
                            <Button
                                component={Link}
                                to="/catalog"
                                color="greenman"
                                radius="xl"
                                size="md"
                                leftSection={<IconShoppingBag size={16} stroke={1.8} />}
                            >
                                {t('common.catalog')}
                            </Button>
                            <Button
                                component={Link}
                                to="/"
                                variant="light"
                                color="greenman"
                                radius="xl"
                                size="md"
                            >
                                {t('common.home')}
                            </Button>
                        </>
                    }
                />
            </PageContainer>
        );
    }

    return (
        <PageContainer size="xl" className={s.page}>
            <ScrollToTop />
            <Helmet>
                <title>{t('cart.seo_title')}</title>
            </Helmet>
            <Breadcrumbs
                items={[
                    { label: t('common.home'), to: '/' },
                    { label: t('cart.title') },
                ]}
            />

            <header className={s.header}>
                <h1 className={s.title}>{t('cart.title')}</h1>
                <p className={s.subtitle}>
                    {t('common.pieces')} — {totalItems}
                </p>
            </header>

            <div className={s.layout}>
                <section className={s.items}>
                    {cart.map((line) => {
                        const linePrice = toDisplayPrice(line.type.price, country);
                        return (
                            <div key={line.id} className={s.line}>
                                <Link to={`/product/${line.id}`} className={s.lineThumb}>
                                    <PlaceholderImage
                                        name={line.name}
                                        size="sm"
                                        rounded="md"
                                        aspect="1/1"
                                    />
                                </Link>
                                <div className={s.lineBody}>
                                    <Link
                                        to={`/product/${line.id}`}
                                        className={s.lineName}
                                    >
                                        {line.name}
                                    </Link>
                                    {line.description && (
                                        <div className={s.lineDesc}>
                                            {truncate(line.description, 100)}
                                        </div>
                                    )}
                                    <div className={s.lineMeta}>
                                        <span className={s.typeChip}>
                                            {line.type.type}
                                        </span>
                                        <PricePill
                                            value={linePrice}
                                            currency={currencyCode}
                                            size="sm"
                                        />
                                    </div>
                                </div>
                                <div className={s.lineActions}>
                                    <div className={s.qtyStepper}>
                                        <button
                                            type="button"
                                            className={s.qtyBtn}
                                            onClick={() =>
                                                line.quantity > 1
                                                    ? updateQuantity(
                                                          line.id,
                                                          line.quantity - 1,
                                                      )
                                                    : removeFromCart(line.id)
                                            }
                                            aria-label="-"
                                        >
                                            <IconMinus size={14} stroke={2} />
                                        </button>
                                        <span className={s.qtyCount}>
                                            {line.quantity}
                                        </span>
                                        <button
                                            type="button"
                                            className={s.qtyBtn}
                                            onClick={() =>
                                                updateQuantity(
                                                    line.id,
                                                    line.quantity + 1,
                                                )
                                            }
                                            aria-label="+"
                                        >
                                            <IconPlus size={14} stroke={2} />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        className={s.removeBtn}
                                        onClick={() => removeFromCart(line.id)}
                                        aria-label="remove"
                                    >
                                        <IconTrash size={14} stroke={1.8} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </section>

                <aside className={s.summary}>
                    <div className={s.summaryCard}>
                        <h2 className={s.summaryTitle}>
                            {t('cart.summary.title')}
                        </h2>
                        <div className={s.summaryRow}>
                            <span>{t('cart.summary.subtotal')}</span>
                            <strong>
                                <PricePill
                                    value={subtotal}
                                    currency={currencyCode}
                                    size="sm"
                                />
                            </strong>
                        </div>
                        <div className={s.summaryRow}>
                            <span>{t('cart.summary.delivery')}</span>
                            <span className={s.summaryMuted}>
                                {t('cart.summary.delivery_calc')}
                            </span>
                        </div>
                        <div className={s.summaryTotal}>
                            <span>{t('cart.summary.total')}</span>
                            <PricePill
                                value={subtotal}
                                currency={currencyCode}
                                size="lg"
                            />
                        </div>
                        <Button
                            onClick={() => navigate('/checkout')}
                            size="lg"
                            radius="xl"
                            color="greenman"
                            fullWidth
                            rightSection={
                                <IconArrowNarrowRight size={18} stroke={1.8} />
                            }
                        >
                            {t('cart.actions.to_checkout')}
                        </Button>
                        <Button
                            component={Link}
                            to="/catalog"
                            variant="subtle"
                            color="greenman"
                            size="sm"
                            fullWidth
                        >
                            {t('common.catalog')}
                        </Button>
                    </div>
                </aside>
            </div>
        </PageContainer>
    );
};

export default Cart;
