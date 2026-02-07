import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import { Box, Button, Card, CardContent, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useGetList, useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const periodLabels = {
    day: 'За день',
    week: 'За неделю',
    month: 'За месяц'
};

const formatMoney = (value) =>
    `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(value || 0))} ₸`;

const metricCardSx = {
    height: '100%',
    border: '1px solid rgba(16,40,29,0.08)',
    boxShadow: '0 16px 36px rgba(16,40,29,0.09)',
    transition: 'transform 160ms ease, box-shadow 160ms ease',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 20px 44px rgba(16,40,29,0.12)'
    }
};

const useDashboardAnalytics = (period) => {
    const [data, setData] = useState({
        revenue: 0,
        ordersCount: 0,
        topCity: null,
        topProduct: null
    });
    const [loading, setLoading] = useState(true);
    const notify = useNotify();

    useEffect(() => {
        let isMounted = true;

        const loadAnalytics = async () => {
            setLoading(true);
            try {
                const token = adminAuthStorage.getToken();
                const response = await fetch(apiUrl(`/admin/analytics/dashboard?period=${period}`), {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const body = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(body.message || 'Не удалось получить аналитику');
                }

                if (isMounted) {
                    setData({
                        revenue: Number(body?.data?.revenue || 0),
                        ordersCount: Number(body?.data?.ordersCount || 0),
                        topCity: body?.data?.topCity || null,
                        topProduct: body?.data?.topProduct || null
                    });
                }
            } catch (error) {
                notify(error.message, { type: 'error' });
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadAnalytics();

        return () => {
            isMounted = false;
        };
    }, [period, notify]);

    return { data, loading };
};

const AdminDashboard = () => {
    const [period, setPeriod] = useState('month');
    const { total: totalProducts = 0 } = useGetList('products', {
        pagination: { page: 1, perPage: 1 },
        sort: { field: 'id', order: 'DESC' }
    });
    const { data: analytics, loading } = useDashboardAnalytics(period);

    return (
        <Stack spacing={2.5}>
            <Box
                sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 3,
                    border: '1px solid rgba(16,40,29,0.08)',
                    background: 'linear-gradient(135deg, rgba(31,154,96,0.18) 0%, rgba(19,111,99,0.22) 100%)'
                }}
            >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
                    <Box>
                        <Typography variant="h5" sx={{ mb: 1 }}>
                            Оперативная панель
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Выручка и сводка по заказам за выбранный период.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        {Object.entries(periodLabels).map(([key, label]) => (
                            <Button
                                key={key}
                                variant={period === key ? 'contained' : 'outlined'}
                                onClick={() => setPeriod(key)}
                            >
                                {label}
                            </Button>
                        ))}
                    </Stack>
                </Stack>
            </Box>

            <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                    <Card sx={metricCardSx}>
                        <CardContent>
                            <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <TrendingUpOutlinedIcon />
                                    {loading && <CircularProgress size={18} />}
                                </Stack>
                                <Typography variant="body2" color="text.secondary">
                                    Выручка ({periodLabels[period]})
                                </Typography>
                                <Typography variant="h5">{formatMoney(analytics.revenue)}</Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={metricCardSx}>
                        <CardContent>
                            <Stack spacing={1}>
                                <ShoppingCartOutlinedIcon />
                                <Typography variant="body2" color="text.secondary">
                                    Заказов ({periodLabels[period]})
                                </Typography>
                                <Typography variant="h5">{analytics.ordersCount}</Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={metricCardSx}>
                        <CardContent>
                            <Stack spacing={1}>
                                <PlaceOutlinedIcon />
                                <Typography variant="body2" color="text.secondary">
                                    Частый город
                                </Typography>
                                <Typography variant="h6">{analytics.topCity?.name || 'Нет данных'}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {analytics.topCity ? `${analytics.topCity.count} заказов` : ''}
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={metricCardSx}>
                        <CardContent>
                            <Stack spacing={1}>
                                <BarChartOutlinedIcon />
                                <Typography variant="body2" color="text.secondary">
                                    Частый товар
                                </Typography>
                                <Typography variant="h6">{analytics.topProduct?.name || 'Нет данных'}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {analytics.topProduct ? `${analytics.topProduct.count} шт.` : ''}
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <Card sx={metricCardSx}>
                        <CardContent>
                            <Stack spacing={1}>
                                <Inventory2OutlinedIcon />
                                <Typography variant="body2" color="text.secondary">
                                    Товаров в каталоге
                                </Typography>
                                <Typography variant="h4">{totalProducts}</Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={metricCardSx}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                Быстрые действия
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                                <Button component="a" href="/admin/orders" variant="contained">
                                    Заказы
                                </Button>
                                <Button component="a" href="/admin/products" variant="outlined">
                                    Товары
                                </Button>
                                <Button component="a" href="/admin/accounting" variant="outlined">
                                    Бухгалтерия
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={metricCardSx}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                Склад и QR
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <Button component="a" href="/admin/incoming" variant="contained">
                                    Приход
                                </Button>
                                <Button component="a" href="/admin/qr-codes" variant="outlined">
                                    QR-коды
                                </Button>
                            </Stack>
                            <Box sx={{ mt: 2, display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                <QrCode2OutlinedIcon sx={{ fontSize: 18 }} />
                                <Typography variant="body2" color="text.secondary">
                                    QR-секция активна
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Stack>
    );
};

export default AdminDashboard;
