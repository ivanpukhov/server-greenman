import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../config/api';
import { IconLeaf } from '../../icons';
import Product from './Product';

const CatalogTop = ({ limit = 8 }) => {
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios
            .get(apiUrl('/products'))
            .then((res) => {
                const items = Array.isArray(res.data) ? res.data : [];
                setProducts(items.slice(0, limit));
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [limit]);

    if (loading) {
        return (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                {Array.from({ length: limit }).map((_, i) => (
                    <Skeleton key={i} h={260} radius="lg" />
                ))}
            </SimpleGrid>
        );
    }

    if (error || !products.length) {
        return (
            <Stack align="center" py="xl" gap="xs">
                <IconLeaf size={40} stroke={1.4} color="var(--mantine-color-greenman-5)" />
                <Text c="dimmed">{t('catalog.empty_title')}</Text>
            </Stack>
        );
    }

    return (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
            {products.map((product) => (
                <Product key={product.id} product={product} />
            ))}
        </SimpleGrid>
    );
};

export default CatalogTop;
