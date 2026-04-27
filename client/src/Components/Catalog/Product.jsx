import React from 'react';
import { NavLink } from 'react-router-dom';
import { Card, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useFormatPrice } from '../../contexts/CountryContext.jsx';
import { publicAssetUrl } from '../../config/api.js';
import AddToCartControl from './AddToCartControl.jsx';
import s from './Product.module.scss';

const Product = ({ product }) => {
    const { t } = useTranslation();
    const formatPrice = useFormatPrice();
    const minPrice = product.types?.length
        ? Math.min(...product.types.map((type) => type.price))
        : 0;
    const imageUrl = Array.isArray(product.imageUrls)
        ? product.imageUrls.find(Boolean)
        : null;

    const initial = (product.name || '?').trim().charAt(0).toUpperCase();

    return (
        <Card className={s.card} padding="lg" radius="lg" withBorder>
            <NavLink to={`/product/${product.id}`} className={s.media} aria-label={product.name}>
                <div className={s.thumb} aria-hidden="true">
                    {imageUrl ? (
                        <img className={s.thumbImage} src={publicAssetUrl(imageUrl)} alt="" loading="lazy" />
                    ) : (
                        <span className={s.thumbInitial}>{initial}</span>
                    )}
                </div>
            </NavLink>

            <NavLink to={`/product/${product.id}`} className={s.body}>
                <Stack gap={6}>
                    <Text fw={700} size="sm" lineClamp={2} className={s.name}>
                        {product.name}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={2} className={s.desc}>
                        {product.description}
                    </Text>
                </Stack>
            </NavLink>

            <div className={s.footer}>
                <Text fw={800} size="md" className={s.price}>
                    {formatPrice(minPrice)}
                </Text>
                <AddToCartControl product={product} compact />
            </div>
        </Card>
    );
};

export default Product;
