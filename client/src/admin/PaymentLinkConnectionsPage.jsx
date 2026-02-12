import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useMediaQuery
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const formatDateTime = (value) => {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString('ru-RU');
};

const PaymentLinkConnectionsPage = () => {
    const notify = useNotify();
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('md'));
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [rows, setRows] = useState([]);
    const [deletingId, setDeletingId] = useState(null);

    const loadData = useCallback(
        async (searchQuery = '') => {
            setLoading(true);
            try {
                const token = adminAuthStorage.getToken();
                const params = new URLSearchParams({
                    sort: JSON.stringify(['receivedAt', 'DESC']),
                    range: JSON.stringify([0, 999]),
                    filter: JSON.stringify(searchQuery ? { q: searchQuery } : {})
                });

                const response = await fetch(apiUrl(`/admin/accounting/payment-link-connections?${params.toString()}`), {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const body = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(body.message || 'Не удалось загрузить связи');
                }

                setRows(Array.isArray(body.data) ? body.data : []);
            } catch (error) {
                notify(error.message, { type: 'error' });
            } finally {
                setLoading(false);
            }
        },
        [notify]
    );

    useEffect(() => {
        loadData('');
    }, [loadData]);

    const onSearch = (event) => {
        event.preventDefault();
        loadData(query.trim());
    };

    const onDelete = async (rowId) => {
        if (deletingId) {
            return;
        }

        const confirmed = window.confirm('Удалить эту связь клиента и ссылки?');
        if (!confirmed) {
            return;
        }

        setDeletingId(rowId);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl(`/admin/accounting/payment-link-connections/${rowId}`), {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(body.message || 'Не удалось удалить связь');
            }

            notify('Связь удалена', { type: 'success' });
            await loadData(query.trim());
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setDeletingId(null);
        }
    };

    const onCreateOrder = (row) => {
        const params = new URLSearchParams();
        params.set('paymentLinkConnectionId', String(row.id));

        const normalizedPhone = String(row.customerPhone || '').replace(/\D/g, '').slice(-10);
        if (normalizedPhone) {
            params.set('phoneNumber', normalizedPhone);
            params.set('kaspiNumber', normalizedPhone);
        }

        window.location.hash = `#/orders/create?${params.toString()}`;
    };

    return (
        <Stack spacing={2}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} gap={1.5}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">Связь клиента и ссылки</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Показывает все перехваченные ссылки, даже если заказ еще не оформлен.
                        </Typography>
                    </Box>
                    <Box
                        component="form"
                        onSubmit={onSearch}
                        sx={{ display: 'flex', gap: 1, width: { xs: '100%', md: 420 }, flexWrap: 'wrap' }}
                    >
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="Поиск по номеру или ссылке"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <Button type="submit" variant="contained" startIcon={<SearchOutlinedIcon />}>
                            Найти
                        </Button>
                        <Button
                            type="button"
                            variant="outlined"
                            onClick={() => loadData(query.trim())}
                            startIcon={<RefreshOutlinedIcon />}
                        >
                            Обновить
                        </Button>
                    </Box>
                </Stack>
            </Paper>

            <Paper sx={{ borderRadius: 2, overflow: 'hidden', p: isSmall ? 1.2 : 0 }}>
                {isSmall ? (
                    <Stack spacing={1.2}>
                        {rows.map((row) => (
                            <Card key={row.id} variant="outlined" sx={{ borderRadius: 2 }}>
                                <CardContent>
                                    <Typography variant="subtitle2">{row.customerPhone || '—'}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Получено: {formatDateTime(row.receivedAt)}
                                    </Typography>
                                    <Typography variant="body2">Статус заказа: {row.orderStatus || '—'}</Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                        {row.isPaid ? (
                                            <Chip label="Оплачено" size="small" color="success" />
                                        ) : (
                                            <Chip label="Ожидается" size="small" color="default" variant="outlined" />
                                        )}
                                        {row.orderId ? (
                                            <Button component="a" href={`#/orders/${row.orderId}/show`} size="small">
                                                Заказ #{row.orderId}
                                            </Button>
                                        ) : (
                                            <Chip label="Еще не оформлен" size="small" color="warning" variant="outlined" />
                                        )}
                                    </Stack>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<AddShoppingCartOutlinedIcon />}
                                        disabled={Boolean(row.orderId)}
                                        onClick={() => onCreateOrder(row)}
                                        sx={{ mt: 1, mr: 1 }}
                                    >
                                        Оформить заказ
                                    </Button>
                                    <Button
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        startIcon={<DeleteOutlineOutlinedIcon />}
                                        disabled={deletingId === row.id}
                                        onClick={() => onDelete(row.id)}
                                        sx={{ mt: 1 }}
                                    >
                                        Удалить
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                        {!loading && rows.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                Данные не найдены
                            </Typography>
                        )}
                    </Stack>
                ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 760 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Телефон</TableCell>
                                    <TableCell>Оплата</TableCell>
                                    <TableCell>Получено</TableCell>
                                    <TableCell>Заказ</TableCell>
                                    <TableCell>Статус</TableCell>
                                    <TableCell align="right">Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>{row.customerPhone || '—'}</TableCell>
                                        <TableCell>
                                            {row.isPaid ? (
                                                <Chip label="Оплачено" size="small" color="success" />
                                            ) : (
                                                <Chip label="Ожидается" size="small" color="default" variant="outlined" />
                                            )}
                                        </TableCell>
                                        <TableCell>{formatDateTime(row.receivedAt)}</TableCell>
                                        <TableCell>
                                            {row.orderId ? (
                                                <Button component="a" href={`#/orders/${row.orderId}/show`} size="small">
                                                    #{row.orderId}
                                                </Button>
                                            ) : (
                                                <Chip label="Еще не оформлен" size="small" color="warning" variant="outlined" />
                                            )}
                                        </TableCell>
                                        <TableCell>{row.orderStatus || '—'}</TableCell>
                                        <TableCell align="right">
                                            <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<AddShoppingCartOutlinedIcon />}
                                                disabled={Boolean(row.orderId)}
                                                onClick={() => onCreateOrder(row)}
                                                sx={{ mr: 1 }}
                                            >
                                                Оформить заказ
                                            </Button>
                                            <Button
                                                size="small"
                                                color="error"
                                                variant="outlined"
                                                startIcon={<DeleteOutlineOutlinedIcon />}
                                                disabled={deletingId === row.id}
                                                onClick={() => onDelete(row.id)}
                                            >
                                                Удалить
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!loading && rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Typography variant="body2" color="text.secondary">
                                                Данные не найдены
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Paper>
        </Stack>
    );
};

export default PaymentLinkConnectionsPage;
