import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import {
    ActionIcon,
    Anchor,
    Badge,
    Box,
    Button,
    Card,
    Center,
    Chip,
    Container,
    Group,
    Loader,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import { apiUrl } from '../../config/api';
import { hasValidSiteSession, useAuth } from '../../AuthContext.jsx';
import Banner from '../Banner/Banner.jsx';
import ScrollToTop from '../ScrollToTop';
import emptyOrders from '../../images/illustrations/empty-orders.svg';
import {
    IconArrowRight,
    IconLogout,
    IconPackage,
    IconTruck,
} from '../../icons';

const STATUS_KEYS = ['all', 'в обработке', 'Оплачено', 'Отправлено', 'Доставлено', 'Отменено'];

const STATUS_SORT_PRIORITY = {
    'в обработке': 0, 'оплачено': 1, 'отправлено': 2, 'доставлено': 3, 'отменено': 4,
};

const STATUS_COLORS = {
    'в обработке': 'yellow', 'оплачено': 'blue', 'отправлено': 'violet',
    'доставлено': 'greenman', 'отменено': 'red',
};

const STATUS_I18N = {
    all: 'profile.status.all',
    'в обработке': 'profile.status.processing',
    'оплачено': 'profile.status.paid',
    'отправлено': 'profile.status.shipped',
    'доставлено': 'profile.status.delivered',
    'отменено': 'profile.status.cancelled',
};

const normalizeStatus = (s) => String(s || '').trim().toLowerCase();

const prettyPhone = (p) => {
    const m = (p || '').match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
    return m ? `+7 (${m[1]}) ${m[2]}-${m[3]}-${m[4]}` : `+7${p || ''}`;
};

const Profile = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState('all');

    useEffect(() => {
        if (!hasValidSiteSession()) navigate('/auth');
    }, [navigate]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        axios.get(apiUrl('/profile/'), { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => setProfileData(r.data))
            .catch((err) => {
                if (err.response?.status === 401) { logout(); navigate('/auth'); }
            });
    }, [logout, navigate]);

    const handleLogout = () => { logout(); navigate('/auth'); };

    const orders = profileData?.orders || [];

    const availableStatuses = useMemo(
        () => STATUS_KEYS.filter((value) =>
            value === 'all' || orders.some((o) => normalizeStatus(o.status) === normalizeStatus(value))
        ),
        [orders]
    );

    const filteredOrders = useMemo(() => {
        return [...orders]
            .filter((o) => selectedStatus === 'all' || normalizeStatus(o.status) === normalizeStatus(selectedStatus))
            .sort((a, b) => {
                const pa = STATUS_SORT_PRIORITY[normalizeStatus(a.status)] ?? 99;
                const pb = STATUS_SORT_PRIORITY[normalizeStatus(b.status)] ?? 99;
                return pa !== pb ? pa - pb : b.id - a.id;
            });
    }, [orders, selectedStatus]);

    if (!profileData) {
        return <Center py={80}><Loader color="greenman" size="lg" /></Center>;
    }

    const initials = (profileData.phoneNumber || '?').slice(-2);

    if (orders.length === 0) {
        return (
            <Container size="xl" px="md" py="md">
                <ScrollToTop />
                <Helmet>
                    <title>{t('profile.title')} — GreenMan</title>
                </Helmet>
                <Card radius="lg" withBorder padding="lg" mb="xl">
                    <Group justify="space-between">
                        <Group gap="sm">
                            <Box
                                style={{
                                    width: 44, height: 44, borderRadius: 999,
                                    background: 'linear-gradient(135deg, var(--mantine-color-greenman-1), var(--mantine-color-greenman-3))',
                                    color: 'var(--mantine-color-greenman-8)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                                }}
                            >
                                {initials}
                            </Box>
                            <Stack gap={2}>
                                <Text fw={700}>{t('profile.title')}</Text>
                                <Text size="sm" c="dimmed">{prettyPhone(profileData.phoneNumber)}</Text>
                            </Stack>
                        </Group>
                        <ActionIcon variant="subtle" color="red" size="lg" radius="xl" onClick={handleLogout} aria-label={t('profile.logout')}>
                            <IconLogout size={18} stroke={1.7} />
                        </ActionIcon>
                    </Group>
                </Card>
                <Stack align="center" py={60} gap="xs">
                    <img src={emptyOrders} alt="" style={{ width: 220, height: 'auto' }} />
                    <Title order={3}>{t('profile.empty_title')}</Title>
                    <Text c="dimmed" ta="center" size="sm" maw={420}>{t('profile.empty_text')}</Text>
                    <Group mt="sm">
                        <Button component={Link} to="/" variant="light" color="greenman" radius="xl">{t('common.home')}</Button>
                        <Button component={Link} to="/catalog" color="greenman" radius="xl">{t('common.catalog')}</Button>
                    </Group>
                </Stack>
                <Banner />
            </Container>
        );
    }

    return (
        <Container size="xl" px="md" py="md">
            <ScrollToTop />
            <Helmet>
                <title>{t('profile.title')} — GreenMan</title>
            </Helmet>

            <Card radius="lg" withBorder padding="lg" mb="lg">
                <Group justify="space-between">
                    <Group gap="sm">
                        <Box
                            style={{
                                width: 48, height: 48, borderRadius: 999,
                                background: 'linear-gradient(135deg, var(--mantine-color-greenman-1), var(--mantine-color-greenman-3))',
                                color: 'var(--mantine-color-greenman-8)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                            }}
                        >
                            {initials}
                        </Box>
                        <Stack gap={2}>
                            <Text fw={700}>{t('profile.title')}</Text>
                            <Text size="sm" c="dimmed">{prettyPhone(profileData.phoneNumber)}</Text>
                        </Stack>
                    </Group>
                    <Button
                        variant="subtle"
                        color="red"
                        radius="xl"
                        size="sm"
                        leftSection={<IconLogout size={16} stroke={1.7} />}
                        onClick={handleLogout}
                    >
                        {t('profile.logout')}
                    </Button>
                </Group>
            </Card>

            <Title order={3} mb="md" style={{ letterSpacing: '-0.02em' }}>{t('profile.orders_title')}</Title>

            {availableStatuses.length > 1 && (
                <Group gap={6} wrap="wrap" mb="md">
                    {availableStatuses.map((value) => (
                        <Chip
                            key={value}
                            checked={selectedStatus === value}
                            onChange={() => setSelectedStatus(value)}
                            color="greenman"
                            radius="xl"
                            variant="light"
                            size="sm"
                        >
                            {t(STATUS_I18N[normalizeStatus(value)] || STATUS_I18N.all)}
                        </Chip>
                    ))}
                </Group>
            )}

            {filteredOrders.length === 0 ? (
                <Center py={40}>
                    <Text c="dimmed" size="sm">{t('profile.empty_status')}</Text>
                </Center>
            ) : (
                <Stack gap="sm">
                    {filteredOrders.map((order) => {
                        const status = normalizeStatus(order.status);
                        const currencySymbol = order.currency === 'RUB' ? '₽' : '₸';
                        const formattedTotal = new Intl.NumberFormat(order.currency === 'RUB' ? 'ru-RU' : 'ru-KZ', { maximumFractionDigits: 0 }).format(order.totalPrice);
                        return (
                            <Card key={order.id} radius="lg" withBorder padding="md">
                                <Group justify="space-between" align="flex-start" mb="sm">
                                    <Group gap="xs">
                                        <IconPackage size={20} stroke={1.6} color="var(--mantine-color-greenman-7)" />
                                        <Stack gap={0}>
                                            <Text fw={700} size="sm">{t('profile.order.number', { number: order.id })}</Text>
                                            <Text size="xs" c="dimmed">
                                                {order.trackingNumber || t('profile.order.processing')}
                                            </Text>
                                        </Stack>
                                    </Group>
                                    <Badge color={STATUS_COLORS[status] || 'gray'} variant="light" radius="sm">
                                        {t(STATUS_I18N[status] || STATUS_I18N.all)}
                                    </Badge>
                                </Group>

                                <Stack gap={4} mb="sm">
                                    {order.products.map((product) => (
                                        <Anchor
                                            key={product.productId}
                                            component={Link}
                                            to={`/product/${product.productId}`}
                                            underline="never"
                                        >
                                            <Group justify="space-between" gap="xs" py={4}>
                                                <Text size="sm" c="dark" lineClamp={1}>
                                                    {product.product} <Text component="span" c="dimmed">· {product.type}</Text>
                                                </Text>
                                                <Text size="sm" c="dimmed" fw={500}>×{product.quantity}</Text>
                                            </Group>
                                        </Anchor>
                                    ))}
                                </Stack>

                                <Group justify="space-between" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-1)' }}>
                                    <Text size="sm" c="dimmed">{t('profile.order.total')}</Text>
                                    <Text fw={800} c="greenman" style={{ letterSpacing: '-0.01em' }}>
                                        {formattedTotal} {currencySymbol}
                                    </Text>
                                </Group>

                                {order.trackingNumber && (
                                    <Button
                                        component="a"
                                        href={`https://track.greenman.kz/${order.trackingNumber}`}
                                        target="_blank"
                                        variant="light"
                                        color="greenman"
                                        radius="xl"
                                        size="xs"
                                        mt="sm"
                                        leftSection={<IconTruck size={14} stroke={1.7} />}
                                        rightSection={<IconArrowRight size={14} stroke={1.7} />}
                                    >
                                        {t('profile.order.track')}
                                    </Button>
                                )}
                            </Card>
                        );
                    })}
                </Stack>
            )}

            <Box mt="xl">
                <Banner />
            </Box>
        </Container>
    );
};

export default Profile;
