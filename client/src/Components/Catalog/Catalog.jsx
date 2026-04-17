import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import {
    ActionIcon,
    Container,
    Group,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../config/api';
import { IconArrowLeft, IconLeaf, IconSearch } from '../../icons';
import Product from './Product';
import emptySearch from '../../images/illustrations/empty-search.svg';

const Catalog = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        axios
            .get(apiUrl('/products'))
            .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const productsWithTypes = useMemo(
        () => products.filter((p) => p.types && p.types.length > 0),
        [products]
    );

    const filtered = useMemo(() => {
        if (!query.trim()) return productsWithTypes;
        const q = query.toLowerCase();
        return productsWithTypes.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
        );
    }, [productsWithTypes, query]);

    return (
        <Container size="xl" px="md" py="md">
            <Helmet>
                <title>{t('catalog.seo_title')}</title>
                <meta name="description" content={t('catalog.seo_description')} />
            </Helmet>

            <Group gap="sm" mb="md">
                <ActionIcon
                    variant="subtle"
                    radius="xl"
                    size="lg"
                    onClick={() => navigate(-1)}
                    aria-label={t('common.back')}
                >
                    <IconArrowLeft size={20} stroke={1.7} />
                </ActionIcon>
                <Stack gap={0}>
                    <Title order={2} style={{ letterSpacing: '-0.02em' }}>
                        {t('catalog.title')}
                    </Title>
                    <Text size="sm" c="dimmed">{t('catalog.subtitle')}</Text>
                </Stack>
            </Group>

            <TextInput
                placeholder={t('header.search_placeholder_name')}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                leftSection={<IconSearch size={18} stroke={1.7} />}
                radius="xl"
                size="md"
                mb="lg"
            />

            {loading ? (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} h={260} radius="lg" />
                    ))}
                </SimpleGrid>
            ) : error ? (
                <Stack align="center" py="xl" gap="xs">
                    <IconLeaf size={40} stroke={1.4} color="var(--mantine-color-red-5)" />
                    <Text c="red">{error}</Text>
                </Stack>
            ) : filtered.length === 0 ? (
                <Stack align="center" py={64} gap="xs">
                    <img src={emptySearch} alt="" style={{ width: 200, height: 'auto' }} />
                    <Title order={4}>{t('catalog.empty_title')}</Title>
                    <Text size="sm" c="dimmed">{t('catalog.empty_text')}</Text>
                </Stack>
            ) : (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                    {filtered.map((product) => (
                        <Product key={product.id} product={product} />
                    ))}
                </SimpleGrid>
            )}
        </Container>
    );
};

export default Catalog;
