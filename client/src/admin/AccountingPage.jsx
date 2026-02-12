import { useCallback, useEffect, useState } from 'react';
import {
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
    Typography,
    useMediaQuery
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
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('md'));
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
    const [deletingExpenseId, setDeletingExpenseId] = useState(null);

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
                        )}&filter=${encodeURIComponent(JSON.stringify({ period, paidOnly: true, excludeIvanDasha: true }))}`
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
                    Распределение прихода по счетам
                </Typography>
                {isSmall ? (
                    <Stack spacing={1.2}>
                        {(summary.allocations?.byAccount || []).map((item) => (
                            <Card key={item.accountName} variant="outlined" sx={{ borderRadius: 2 }}>
                                <CardContent>
                                    <Typography variant="subtitle2">{item.accountName}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Заказов: {item.ordersCount}
                                    </Typography>
                                    <Typography variant="body1">{formatMoney(item.total)}</Typography>
                                </CardContent>
                            </Card>
                        ))}
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent>
                                <Typography variant="subtitle2">{summary.allocations?.withoutLink?.accountName || 'Без ссылки'}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Заказов: {summary.allocations?.withoutLink?.ordersCount || 0}
                                </Typography>
                                <Typography variant="body1">{formatMoney(summary.allocations?.withoutLink?.total || 0)}</Typography>
                            </CardContent>
                        </Card>
                    </Stack>
                ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 640 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Счёт</TableCell>
                                    <TableCell align="right">Заказов</TableCell>
                                    <TableCell align="right">Сумма</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(summary.allocations?.byAccount || []).map((item) => (
                                    <TableRow key={item.accountName}>
                                        <TableCell>{item.accountName}</TableCell>
                                        <TableCell align="right">{item.ordersCount}</TableCell>
                                        <TableCell align="right">{formatMoney(item.total)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell>{summary.allocations?.withoutLink?.accountName || 'Без ссылки'}</TableCell>
                                    <TableCell align="right">{summary.allocations?.withoutLink?.ordersCount || 0}</TableCell>
                                    <TableCell align="right">{formatMoney(summary.allocations?.withoutLink?.total || 0)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Оплаченные заказы (учтены в приходе)
                </Typography>
                {isSmall ? (
                    <Stack spacing={1.2}>
                        {orders.map((order) => (
                            <Card key={order.id} variant="outlined" sx={{ borderRadius: 2 }}>
                                <CardContent>
                                    <Typography variant="subtitle2">Заказ #{order.id}</Typography>
                                    <Typography variant="body2" color="text.secondary">{formatDate(order.createdAt)}</Typography>
                                    <Typography variant="body2">Клиент: {order.customerName}</Typography>
                                    <Typography variant="body2">Город: {order.city}</Typography>
                                    <Typography variant="body2">Статус: {order.status}</Typography>
                                    <Typography variant="body2">Счёт: {order.accountName || 'Без ссылки'}</Typography>
                                    <Typography variant="body1" sx={{ mt: 0.5 }}>{formatMoney(order.totalPrice)}</Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 860 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    <TableCell>Дата</TableCell>
                                    <TableCell>Клиент</TableCell>
                                    <TableCell>Город</TableCell>
                                    <TableCell>Статус</TableCell>
                                    <TableCell>Счёт</TableCell>
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
                                        <TableCell>{order.accountName || 'Без ссылки'}</TableCell>
                                        <TableCell align="right">{formatMoney(order.totalPrice)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Расходы
                </Typography>
                {isSmall ? (
                    <Stack spacing={1.2}>
                        {expenses.map((expense) => (
                            <Card key={expense.id} variant="outlined" sx={{ borderRadius: 2 }}>
                                <CardContent>
                                    <Typography variant="subtitle2">{expense.category}</Typography>
                                    <Typography variant="body2" color="text.secondary">{formatDate(expense.spentAt)}</Typography>
                                    <Typography variant="body2">Кто потратил: {expense.spentByName}</Typography>
                                    <Typography variant="body2">Комментарий: {expense.description || '-'}</Typography>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                                        <Typography variant="body1">{formatMoney(expense.amount)}</Typography>
                                        <Button
                                            color="error"
                                            size="small"
                                            onClick={() => onDeleteExpense(expense.id)}
                                            disabled={deletingExpenseId === expense.id}
                                        >
                                            Удалить
                                        </Button>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 860 }}>
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
                    </Box>
                )}
            </Paper>
        </Stack>
    );
};

export default AccountingPage;
