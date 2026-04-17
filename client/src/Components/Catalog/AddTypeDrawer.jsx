import React, { useEffect, useState } from 'react';
import { Drawer, SegmentedControl } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../CartContext.jsx';
import { useCountry } from '../../contexts/CountryContext';
import { CURRENCIES, toDisplayPrice } from '../../config/currency';
import { IconShoppingBag, IconAlertCircle } from '../../icons';
import { Button, PricePill } from '../../ui';
import s from './AddTypeDrawer.module.scss';

const AddTypeDrawer = ({ product, onClose }) => {
    const { t } = useTranslation();
    const { addToCart } = useCart();
    const { country } = useCountry();
    const currencyCode = CURRENCIES[country]?.code || 'KZT';

    const [selected, setSelected] = useState(0);

    useEffect(() => {
        if (product) setSelected(0);
    }, [product]);

    if (!product) {
        return (
            <Drawer
                opened={false}
                onClose={() => onClose(null)}
                position="bottom"
                size="auto"
                radius="xl"
            />
        );
    }

    const types = product.types || [];
    const current = types[selected] || types[0];
    const displayPrice = toDisplayPrice(current?.price || 0, country);

    const handleAdd = () => {
        addToCart({ ...product, type: current, quantity: 1 });
        onClose({ name: product.name });
    };

    return (
        <Drawer
            opened={true}
            onClose={() => onClose(null)}
            position="bottom"
            size="auto"
            radius="xl"
            padding="lg"
            title={<span className={s.title}>{product.name}</span>}
            classNames={{ body: s.body }}
        >
            <div className={s.inner}>
                <SegmentedControl
                    fullWidth
                    radius="xl"
                    color="greenman"
                    data={types.map((type, idx) => ({
                        label: type.type,
                        value: String(idx),
                    }))}
                    value={String(selected)}
                    onChange={(val) => setSelected(Number(val))}
                />

                <div className={s.priceRow}>
                    <PricePill
                        value={displayPrice}
                        currency={currencyCode}
                        size="xl"
                    />
                    <Button
                        size="md"
                        color="greenman"
                        leftSection={<IconShoppingBag size={18} stroke={1.8} />}
                        onClick={handleAdd}
                    >
                        {t('product.add_to_cart')}
                    </Button>
                </div>

                {product.contraindications && (
                    <div className={s.warn}>
                        <IconAlertCircle size={18} stroke={1.8} />
                        <div>
                            <div className={s.warnTitle}>
                                {t('product.contraindications')}
                            </div>
                            <div className={s.warnText}>
                                {product.contraindications}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Drawer>
    );
};

export default AddTypeDrawer;
