import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ActionIcon,
    Badge,
    Button,
    Center,
    Container,
    Group,
    Loader,
    SimpleGrid,
    Stack,
    Tabs,
    Text,
    Title,
} from '@mantine/core';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import ScrollToTop from '../ScrollToTop';
import FaqItem from '../FaqItem/FaqItem';
import AddToCartControl from './AddToCartControl.jsx';
import { useFormatPrice } from '../../contexts/CountryContext.jsx';
import {
    IconArrowLeft,
    IconInfoCircle,
    IconLeaf,
    IconAlertCircle,
    IconUser,
    IconMoodKid,
} from '../../icons';
import s from './ProductDetails.module.scss';

const ProductInfo = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const formatPrice = useFormatPrice();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        axios
            .get(`/api/products/${id}`)
            .then((res) => setProduct(res.data))
            .catch(() => setError(t('product.error')))
            .finally(() => setLoading(false));
    }, [id, t]);

    if (loading) return <Center py={80}><Loader color="greenman" size="lg" /></Center>;
    if (error) return <Center py={40}><Text c="red">{error}</Text></Center>;
    if (!product) return <Center py={40}><Text c="dimmed">{t('product.not_found')}</Text></Center>;

    const minPrice = product.types?.length ? Math.min(...product.types.map((tp) => tp.price)) : 0;
    const initial = (product.name || '?').trim().charAt(0).toUpperCase();

    return (
        <Container size="xl" px="md" py="md" className={s.page}>
            <Helmet>
                <title>{`${product.name} — GreenMan`}</title>
                <meta name="description" content={(product.description || '').slice(0, 160)} />
                <meta property="og:title" content={`${product.name} — GreenMan`} />
                <meta property="og:type" content="product" />
            </Helmet>
            <ScrollToTop />

            <Group gap="sm" mb="lg">
                <ActionIcon variant="subtle" size="lg" radius="xl" onClick={() => navigate(-1)} aria-label={t('common.back')}>
                    <IconArrowLeft size={20} stroke={1.7} />
                </ActionIcon>
                <Text size="sm" c="dimmed">{t('product.back_to_catalog')}</Text>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                <div className={s.gallery} aria-hidden="true">
                    <span className={s.galleryInitial}>{initial}</span>
                    <IconLeaf size={40} stroke={1.4} className={s.galleryLeaf} />
                </div>

                <Stack gap="md">
                    <Stack gap={4}>
                        <Title order={1} className={s.title}>{product.name}</Title>
                        <Text size="md" c="dimmed" lh={1.6} lineClamp={4}>
                            {product.description}
                        </Text>
                    </Stack>

                    <Group align="baseline" gap="xs">
                        <Text fw={800} size="2rem" c="greenman" style={{ letterSpacing: '-0.02em' }}>
                            {formatPrice(minPrice)}
                        </Text>
                    </Group>

                    <AddToCartControl product={product} />

                    {product.diseases?.length > 0 && (
                        <Group gap={6} wrap="wrap" mt="xs">
                            {product.diseases.slice(0, 6).map((d, i) => (
                                <Badge key={i} variant="light" color="greenman" radius="sm" size="md">
                                    {d}
                                </Badge>
                            ))}
                        </Group>
                    )}
                </Stack>
            </SimpleGrid>

            <Tabs defaultValue="description" mt={48} color="greenman" variant="pills" radius="xl">
                <Tabs.List grow>
                    <Tabs.Tab value="description" leftSection={<IconInfoCircle size={16} stroke={1.7} />}>
                        {t('product.description')}
                    </Tabs.Tab>
                    <Tabs.Tab value="indications" leftSection={<IconLeaf size={16} stroke={1.7} />}>
                        {t('product.indications')}
                    </Tabs.Tab>
                    <Tabs.Tab value="contraindications" leftSection={<IconAlertCircle size={16} stroke={1.7} />}>
                        {t('product.contraindications')}
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="description" pt="lg">
                    <Text size="md" lh={1.7} style={{ whiteSpace: 'pre-line' }}>
                        {product.description}
                    </Text>
                </Tabs.Panel>

                <Tabs.Panel value="indications" pt="lg">
                    {product.diseases?.length > 0 ? (
                        <Group gap={6} wrap="wrap">
                            {product.diseases.map((d, i) => (
                                <Badge key={i} variant="light" color="greenman" radius="sm" size="lg">
                                    {d}
                                </Badge>
                            ))}
                        </Group>
                    ) : (
                        <Text c="dimmed">—</Text>
                    )}
                </Tabs.Panel>

                <Tabs.Panel value="contraindications" pt="lg">
                    <Text size="md" c="dimmed" lh={1.7}>
                        {product.contraindications || '—'}
                    </Text>
                </Tabs.Panel>
            </Tabs>

            <Stack gap="sm" mt={40}>
                <Title order={3} style={{ letterSpacing: '-0.02em' }}>{t('product.usage')}</Title>
                {product.applicationMethodAdults && (
                    <FaqItem
                        question={t('product.usage_adults')}
                        answer={product.applicationMethodAdults}
                        icon={IconUser}
                    />
                )}
                {product.applicationMethodChildren && (
                    <FaqItem
                        question={t('product.usage_children')}
                        answer={product.applicationMethodChildren}
                        icon={IconMoodKid}
                    />
                )}
            </Stack>
        </Container>
    );
};

export default ProductInfo;
