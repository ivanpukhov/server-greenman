import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../../config/api';
import { hasValidSiteSession, useAuth } from '../../AuthContext.jsx';
import Banner from '../Banner/Banner.jsx';
import ScrollToTop from '../ScrollToTop';
import {
    Accordion, ActionIcon, Anchor, Badge, Box, Button, Center,
    Group, Loader, Paper, SegmentedControl, Stack, Text, Title
} from '@mantine/core';
import logoutImg from '../../images/logout.svg';

const STATUS_FILTERS = [
    { value: 'all', label: 'Все' },
    { value: 'в обработке', label: 'В обработке' },
    { value: 'Оплачено', label: 'Оплачено' },
    { value: 'Отправлено', label: 'Отправлено' },
    { value: 'Доставлено', label: 'Доставлено' },
    { value: 'Отменено', label: 'Отменено' }
];

const STATUS_SORT_PRIORITY = {
    'в обработке': 0, 'оплачено': 1, 'отправлено': 2, 'доставлено': 3, 'отменено': 4
};

const STATUS_COLORS = {
    'в обработке': 'yellow', 'оплачено': 'blue', 'отправлено': 'violet',
    'доставлено': 'greenman', 'отменено': 'red'
};

const normalizeStatus = (s) => String(s || '').trim().toLowerCase();

const Profile = () => {
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
            .then(r => setProfileData(r.data))
            .catch(err => {
                if (err.response?.status === 401) { logout(); navigate('/auth'); }
            });
    }, [logout, navigate]);

    const handleLogout = () => { logout(); navigate('/auth'); };

    if (!profileData) {
        return <Center py={80}><Loader color="greenman" size="lg" /></Center>;
    }

    const orders = profileData?.orders || [];

    if (orders.length === 0) {
        return (
            <div>
                <ScrollToTop />
                <Center py={60}>
                    <Stack align="center" gap="md" maw={360}>
                        <Text size="3rem">🛒</Text>
                        <Title order={3}>У вас ещё нет заказов</Title>
                        <Text c="dimmed" ta="center" size="sm">
                            Выберите товар в каталоге или введите название болезни в поиске
                        </Text>
                        <Group>
                            <Button component={Link} to="/" variant="light" color="greenman" radius="md">На главную</Button>
                            <Button component={Link} to="/catalog" color="greenman" radius="md">Каталог</Button>
                        </Group>
                    </Stack>
                </Center>
                <Banner />
            </div>
        );
    }

    const availableStatuses = STATUS_FILTERS.filter(({ value }) =>
        value === 'all' || orders.some(o => normalizeStatus(o.status) === normalizeStatus(value))
    );

    const filteredOrders = [...orders]
        .filter(o => selectedStatus === 'all' || normalizeStatus(o.status) === normalizeStatus(selectedStatus))
        .sort((a, b) => {
            const pa = STATUS_SORT_PRIORITY[normalizeStatus(a.status)] ?? 99;
            const pb = STATUS_SORT_PRIORITY[normalizeStatus(b.status)] ?? 99;
            return pa !== pb ? pa - pb : b.id - a.id;
        });

    return (
        <div>
            <ScrollToTop />
            <Stack gap="lg" pb="xl">
                <Paper p="md" radius="lg" withBorder style={{ border: '1px solid rgba(0,171,109,0.15)' }}>
                    <Group justify="space-between" align="center">
                        <Stack gap={2}>
                            <Text fw={700} size="lg">Профиль</Text>
                            <Text c="dimmed" size="sm">+7{profileData.phoneNumber}</Text>
                        </Stack>
                        <ActionIcon variant="subtle" color="red" size="lg" onClick={handleLogout}>
                            <img src={logoutImg} alt="Выйти" style={{ width: 20, height: 20 }} />
                        </ActionIcon>
                    </Group>
                </Paper>

                <Title order={3}>Заказы</Title>

                {availableStatuses.length > 1 && (
                    <SegmentedControl
                        fullWidth
                        color="greenman"
                        data={availableStatuses.map(s => ({ label: s.label, value: s.value }))}
                        value={selectedStatus}
                        onChange={setSelectedStatus}
                        size="sm"
                    />
                )}

                {filteredOrders.length === 0 ? (
                    <Center py={32}>
                        <Text c="dimmed">Заказов с этим статусом пока нет</Text>
                    </Center>
                ) : (
                    <Accordion variant="separated" radius="lg">
                        {filteredOrders.map(order => (
                            <Accordion.Item key={order.id} value={String(order.id)} style={{ border: '1px solid rgba(0,171,109,0.15)' }}>
                                <Accordion.Control>
                                    <Group gap="sm" wrap="nowrap">
                                        <Badge
                                            color={STATUS_COLORS[normalizeStatus(order.status)] || 'gray'}
                                            variant="light"
                                            size="sm"
                                        >
                                            {order.status}
                                        </Badge>
                                        <Box style={{ flex: 1, minWidth: 0 }}>
                                            <Text size="sm" fw={600}>№{order.id}</Text>
                                            <Text size="xs" c="dimmed" truncate>
                                                {order.trackingNumber || 'Обрабатывается'}
                                            </Text>
                                        </Box>
                                    </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    <Stack gap="sm">
                                        <Stack gap={4}>
                                            {order.products.map(product => (
                                                <Anchor
                                                    key={product.productId}
                                                    component={Link}
                                                    to={`/product/${product.productId}`}
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    <Paper p="xs" radius="md" withBorder style={{ border: '1px solid rgba(0,171,109,0.1)' }}>
                                                        <Group justify="space-between">
                                                            <Text size="sm">{product.product} {product.type}</Text>
                                                            <Text size="sm" c="dimmed" fw={500}>×{product.quantity}</Text>
                                                        </Group>
                                                    </Paper>
                                                </Anchor>
                                            ))}
                                        </Stack>
                                        <Group justify="space-between" pt="xs">
                                            <Text size="sm" c="dimmed">Сумма заказа</Text>
                                            <Text fw={700} c="greenman">
                                                {new Intl.NumberFormat(order.currency === 'RUB' ? 'ru-RU' : 'ru-KZ', { maximumFractionDigits: 0 }).format(order.totalPrice)}
                                                {' '}{order.currency === 'RUB' ? '₽' : '₸'}
                                            </Text>
                                        </Group>
                                        {order.trackingNumber && (
                                            <Anchor
                                                href={`https://track.greenman.kz/${order.trackingNumber}`}
                                                target="_blank"
                                                size="sm"
                                                c="greenman"
                                            >
                                                Отследить заказ →
                                            </Anchor>
                                        )}
                                    </Stack>
                                </Accordion.Panel>
                            </Accordion.Item>
                        ))}
                    </Accordion>
                )}
            </Stack>
            <Banner />
        </div>
    );
};

export default Profile;
