import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const formatMoney = (value) =>
    `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(value || 0))} ₸`;

const formatDate = (value) => new Date(value).toLocaleString('ru-RU');

const cardSx = {
    border: '1px solid rgba(16,40,29,0.08)',
    boxShadow: '0 12px 32px rgba(16,40,29,0.09)'
};

const periodOptions = [
    { id: 'today', label: 'Сегодня' },
    { id: 'yesterday', label: 'Вчера' },
    { id: 'week', label: 'Неделя' },
    { id: 'month', label: 'Месяц' },
    { id: 'halfyear', label: 'Полгода' }
];

const AccountingPage = () => {
    const notify = useNotify();
    const [period, setPeriod] = useState('month');
    const [summary, setSummary] = useState({
        ordersTotal: 0,
        expensesTotal: 0,
        balance: 0,
        ordersCount: 0,
        expensesCount: 0
    });
    const [orders, setOrders] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingExpenseId, setDeletingExpenseId] = useState(null);
    const [form, setForm] = useState({
        category: '',
        amount: '',
        description: ''
    });

    const currentAdminName = useMemo(() => {
        try {
            const rawUser = localStorage.getItem('admin_user');
            const user = rawUser ? JSON.parse(rawUser) : null;
            return user?.fullName || `+7${user?.phoneNumber || ''}`;
        } catch (_error) {
            return 'Текущий админ';
        }
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const token = adminAuthStorage.getToken();
            const headers = {
                Authorization: `Bearer ${token}`
            };

            const [summaryResponse, ordersResponse, expensesResponse] = await Promise.all([
                fetch(apiUrl(`/admin/accounting/summary?period=${encodeURIComponent(period)}`), { headers }),
                fetch(
                    apiUrl(
                        `/admin/orders?sort=${encodeURIComponent(JSON.stringify(['createdAt', 'DESC']))}&range=${encodeURIComponent(
                            JSON.stringify([0, 99999])
                        )}&filter=${encodeURIComponent(JSON.stringify({ period, paidOnly: true }))}`
                    ),
                    { headers }
                ),
                fetch(
                    apiUrl(
                        `/admin/expenses?sort=${encodeURIComponent(JSON.stringify(['spentAt', 'DESC']))}&range=${encodeURIComponent(
                            JSON.stringify([0, 9999])
                        )}&filter=${encodeURIComponent(JSON.stringify({ period }))}`
                    ),
                    { headers }
                )
            ]);

            const [summaryBody, ordersBody, expensesBody] = await Promise.all([
                summaryResponse.json().catch(() => ({})),
                ordersResponse.json().catch(() => ({})),
                expensesResponse.json().catch(() => ({}))
            ]);

            if (!summaryResponse.ok) {
                throw new Error(summaryBody.message || 'Ошибка загрузки бухгалтерской сводки');
            }
            if (!ordersResponse.ok) {
                throw new Error(ordersBody.message || 'Ошибка загрузки заказов');
            }
            if (!expensesResponse.ok) {
                throw new Error(expensesBody.message || 'Ошибка загрузки расходов');
            }

            setSummary(summaryBody.data || {});
            setOrders(Array.isArray(ordersBody.data) ? ordersBody.data : []);
            setExpenses(Array.isArray(expensesBody.data) ? expensesBody.data : []);
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [notify, period]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onSubmitExpense = async (event) => {
        event.preventDefault();
        if (submitting) {
            return;
        }

        const amount = Number(form.amount);
        if (!form.category.trim()) {
            notify('Укажите категорию расхода', { type: 'warning' });
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            notify('Сумма расхода должна быть больше 0', { type: 'warning' });
            return;
        }

        setSubmitting(true);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl('/admin/expenses'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    category: form.category.trim(),
                    amount,
                    description: form.description.trim()
                })
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || 'Не удалось добавить расход');
            }

            setForm({
                category: '',
                amount: '',
                description: ''
            });
            notify('Расход добавлен', { type: 'success' });
            await loadData();
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const onDeleteExpense = async (expenseId) => {
        if (deletingExpenseId) {
            return;
        }

        const confirmed = window.confirm('Удалить этот расход?');
        if (!confirmed) {
            return;
        }

        setDeletingExpenseId(expenseId);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl(`/admin/expenses/${expenseId}`), {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || 'Не удалось удалить расход');
            }

            notify('Расход удален', { type: 'success' });
            await loadData();
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setDeletingExpenseId(null);
        }
    };

    if (loading) {
        return <Typography>Загрузка бухгалтерии...</Typography>;
    }

    return (
        <Stack spacing={2.5}>
            <Box
                sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 3,
                    border: '1px solid rgba(16,40,29,0.08)',
                    background: 'linear-gradient(135deg, rgba(19,111,99,0.15) 0%, rgba(31,154,96,0.12) 100%)'
                }}
            >
                <Typography variant="h5">Бухгалтерия</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    В приходе учитываются только оплаченные заказы.
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                    {periodOptions.map((option) => (
                        <Button
                            key={option.id}
                            variant={period === option.id ? 'contained' : 'outlined'}
                            onClick={() => setPeriod(option.id)}
                        >
                            {option.label}
                        </Button>
                    ))}
                </Stack>
            </Box>

            <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <Card sx={cardSx}>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary">
                                Приход (заказы)
                            </Typography>
                            <Typography variant="h5">{formatMoney(summary.ordersTotal)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Оплаченных заказов: {summary.ordersCount}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={cardSx}>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary">
                                Расход
                            </Typography>
                            <Typography variant="h5">{formatMoney(summary.expensesTotal)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Операций: {summary.expensesCount}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={cardSx}>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary">
                                Денег сейчас (приход - расход)
                            </Typography>
                            <Typography variant="h5">{formatMoney(summary.balance)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Добавить расход
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Кто потратил: <strong>{currentAdminName}</strong> (автоматически)
                </Alert>
                <Box component="form" onSubmit={onSubmitExpense}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                        <TextField
                            label="Категория / на что"
                            value={form.category}
                            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Сумма"
                            type="number"
                            value={form.amount}
                            onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                            inputProps={{ min: 0, step: 1 }}
                            sx={{ minWidth: 180 }}
                            required
                        />
                    </Stack>
                    <TextField
                        label="Комментарий"
                        value={form.description}
                        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                        fullWidth
                        multiline
                        minRows={2}
                        sx={{ mt: 1.5 }}
                    />
                    <Button type="submit" variant="contained" sx={{ mt: 1.5 }} disabled={submitting}>
                        Добавить расход
                    </Button>
                </Box>
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Расходы
                </Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Дата</TableCell>
                            <TableCell>Кто потратил</TableCell>
                            <TableCell>На что</TableCell>
                            <TableCell>Комментарий</TableCell>
                            <TableCell align="right">Сумма</TableCell>
                            <TableCell align="right">Действие</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {expenses.map((expense) => (
                            <TableRow key={expense.id}>
                                <TableCell>{formatDate(expense.spentAt)}</TableCell>
                                <TableCell>{expense.spentByName}</TableCell>
                                <TableCell>{expense.category}</TableCell>
                                <TableCell>{expense.description || '-'}</TableCell>
                                <TableCell align="right">{formatMoney(expense.amount)}</TableCell>
                                <TableCell align="right">
                                    <Button
                                        color="error"
                                        size="small"
                                        onClick={() => onDeleteExpense(expense.id)}
                                        disabled={deletingExpenseId === expense.id}
                                    >
                                        Удалить
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Оплаченные заказы (учтены в приходе)
                </Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Дата</TableCell>
                            <TableCell>Клиент</TableCell>
                            <TableCell>Город</TableCell>
                            <TableCell>Статус</TableCell>
                            <TableCell align="right">Сумма</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell>{order.id}</TableCell>
                                <TableCell>{formatDate(order.createdAt)}</TableCell>
                                <TableCell>{order.customerName}</TableCell>
                                <TableCell>{order.city}</TableCell>
                                <TableCell>{order.status}</TableCell>
                                <TableCell align="right">{formatMoney(order.totalPrice)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Stack>
    );
};

export default AccountingPage;
