import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
    ActionIcon,
    Container,
    Group,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import Product from './Product';
import SearchBlock from './SearchBlock';
import { IconArrowLeft } from '../../icons';
import emptySearch from '../../images/illustrations/empty-search.svg';

const Search = () => {
    const { t } = useTranslation();
    const { type, query } = useParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!query) return;
        setLoading(true);
        axios
            .get(`/api/products/search/${query}?type=${type}`)
            .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
            .catch((err) => {
                if (err.response?.status === 404) setProducts([]);
                else setError(err.message);
            })
            .finally(() => setLoading(false));
    }, [query, type]);

    return (
        <Container size="xl" px="md" py="md">
            <Helmet>
                <title>{t('search.title')} — GreenMan</title>
                <meta name="description" content={t('search.results_for', { query })} />
            </Helmet>

            <Group gap="sm" mb="md">
                <ActionIcon variant="subtle" size="lg" radius="xl" onClick={() => navigate(-1)} aria-label={t('common.back')}>
                    <IconArrowLeft size={20} stroke={1.7} />
                </ActionIcon>
                <Stack gap={0}>
                    <Title order={2} style={{ letterSpacing: '-0.02em' }}>{t('search.title')}</Title>
                    <Text size="sm" c="dimmed">{t('search.results_for', { query })}</Text>
                </Stack>
            </Group>

            <div style={{ marginBottom: 24 }}>
                <SearchBlock initialType={type} initialQuery={query || ''} />
            </div>

            {loading ? (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} h={260} radius="lg" />
                    ))}
                </SimpleGrid>
            ) : error ? (
                <Stack align="center" py="xl" gap="xs">
                    <Text c="red">{error}</Text>
                </Stack>
            ) : products.length === 0 ? (
                <Stack align="center" py={64} gap="xs">
                    <img src={emptySearch} alt="" style={{ width: 200, height: 'auto' }} />
                    <Title order={4}>{t('search.empty_title')}</Title>
                    <Text size="sm" c="dimmed">{t('search.empty_text')}</Text>
                </Stack>
            ) : (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                    {products.map((product) => (
                        <Product key={product.id} product={product} />
                    ))}
                </SimpleGrid>
            )}
        </Container>
    );
};

export default Search;
