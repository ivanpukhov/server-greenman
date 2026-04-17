import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ActionIcon,
    Badge,
    Box,
    Center,
    Container,
    Divider,
    Group,
    Loader,
    SimpleGrid,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import ScrollToTop from '../ScrollToTop';
import AddToCartControl from './AddToCartControl.jsx';
import { useFormatPrice } from '../../contexts/CountryContext.jsx';
import {
    IconArrowLeft,
    IconAlertCircle,
    IconInfoCircle,
    IconLeaf,
    IconMoodKid,
    IconShieldCheck,
    IconUser,
} from '../../icons';
import s from './ProductDetails.module.scss';

const InfoSection = ({ icon: Icon, title, children, tone = 'default' }) => (
    <Box className={`${s.infoSection} ${tone === 'warning' ? s.infoSectionWarning : ''}`}>
        <Group gap="xs" mb="sm" align="center">
            {Icon && (
                <Box className={`${s.sectionIcon} ${tone === 'warning' ? s.sectionIconWarning : ''}`}>
                    <Icon size={18} stroke={1.7} />
                </Box>
            )}
            <Title order={4} className={s.sectionTitle}>{title}</Title>
        </Group>
        {children}
    </Box>
);

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
                    <Stack gap={6}>
                        <Title order={1} className={s.title}>{product.name}</Title>
                        {product.description && (
                            <Text size="md" c="dimmed" lh={1.6}>
                                {product.description.split('\n')[0]}
                            </Text>
                        )}
                    </Stack>

                    <Group align="baseline" gap="xs">
                        <Text fw={800} size="2rem" c="greenman" style={{ letterSpacing: '-0.02em' }}>
                            {formatPrice(minPrice)}
                        </Text>
                        {product.types?.length > 1 && (
                            <Text size="sm" c="dimmed">/ {product.types[0].type}</Text>
                        )}
                    </Group>

                    <AddToCartControl product={product} />

                    {product.diseases?.length > 0 && (
                        <Box mt="xs">
                            <Text size="xs" c="dimmed" fw={600} mb={6} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                                {t('product.indications')}
                            </Text>
                            <Group gap={6} wrap="wrap">
                                {product.diseases.map((d, i) => (
                                    <Badge key={i} variant="light" color="greenman" radius="sm" size="md">
                                        {d}
                                    </Badge>
                                ))}
                            </Group>
                        </Box>
                    )}
                </Stack>
            </SimpleGrid>

            <Divider my="xl" />

            <Stack gap="md">
                {product.description && (
                    <InfoSection icon={IconInfoCircle} title={t('product.description')}>
                        <Text size="md" lh={1.75} style={{ whiteSpace: 'pre-line' }}>
                            {product.description}
                        </Text>
                    </InfoSection>
                )}

                {(product.applicationMethodAdults || product.applicationMethodChildren) && (
                    <InfoSection icon={IconShieldCheck} title={t('product.usage')}>
                        <SimpleGrid cols={{ base: 1, sm: product.applicationMethodAdults && product.applicationMethodChildren ? 2 : 1 }} spacing="md">
                            {product.applicationMethodAdults && (
                                <Box className={s.usageCard}>
                                    <Group gap="xs" mb={6}>
                                        <IconUser size={18} stroke={1.7} color="var(--mantine-color-greenman-7)" />
                                        <Text fw={700} size="sm">{t('product.usage_adults')}</Text>
                                    </Group>
                                    <Text size="sm" c="dark" lh={1.7} style={{ whiteSpace: 'pre-line' }}>
                                        {product.applicationMethodAdults}
                                    </Text>
                                </Box>
                            )}
                            {product.applicationMethodChildren && (
                                <Box className={s.usageCard}>
                                    <Group gap="xs" mb={6}>
                                        <IconMoodKid size={18} stroke={1.7} color="var(--mantine-color-greenman-7)" />
                                        <Text fw={700} size="sm">{t('product.usage_children')}</Text>
                                    </Group>
                                    <Text size="sm" c="dark" lh={1.7} style={{ whiteSpace: 'pre-line' }}>
                                        {product.applicationMethodChildren}
                                    </Text>
                                </Box>
                            )}
                        </SimpleGrid>
                    </InfoSection>
                )}

                {product.contraindications && (
                    <InfoSection icon={IconAlertCircle} title={t('product.contraindications')} tone="warning">
                        <Text size="md" lh={1.7} style={{ whiteSpace: 'pre-line' }}>
                            {product.contraindications}
                        </Text>
                    </InfoSection>
                )}
            </Stack>
        </Container>
    );
};

export default ProductInfo;
