import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    LinearProgress,
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
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';
import {
    emptyStateSx,
    formatDate,
    formatMoney,
    heroSx,
    metricCardSx,
    mobileCardSx,
    pageStackSx,
    periodOptions,
    sectionSx,
    sectionTitleRowSx,
    summaryGridSx,
    insightGridSx,
    insightCardSx,
    tableSx,
    tableWrapSx
} from './accountingUi';

const WITHOUT_LINK_ACCOUNT_NAME = 'Без ссылки';

const AccountingPage = () => {
    const notify = useNotify();
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('md'));
    const isIvan = adminAuthStorage.isIvan();
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
    const [showAllOrders, setShowAllOrders] = useState(false);
    const [withoutLinkDialogOpen, setWithoutLinkDialogOpen] = useState(false);

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

    useEffect(() => {
        setShowAllOrders(false);
    }, [period]);

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

    const accountFinancialRows = useMemo(
        () => (Array.isArray(summary.accountFinancials?.byAccount) ? summary.accountFinancials.byAccount : []),
        [summary.accountFinancials]
    );
    const income = Number(summary.ordersTotal || 0);
    const expensesTotal = Number(summary.expensesTotal || 0);
    const balance = Number(summary.balance || 0);
    const paidOrdersCount = Number(summary.ordersCount || orders.length || 0);
    const expenseShare = income > 0 ? Math.min(100, Math.max(0, (expensesTotal / income) * 100)) : 0;
    const marginPercent = income > 0 ? Math.round((balance / income) * 100) : 0;
    const averageOrderValue = paidOrdersCount > 0 ? income / paidOrdersCount : 0;
    const ordersToShow = showAllOrders ? orders : orders.slice(0, 5);
    const hasHiddenOrders = orders.length > 5;
    const withoutLinkOrders = useMemo(
        () =>
            orders.filter((order) => {
                const accountName = String(order?.accountName || '').trim() || WITHOUT_LINK_ACCOUNT_NAME;
                return accountName === WITHOUT_LINK_ACCOUNT_NAME;
            }),
        [orders]
    );

    const onOpenWithoutLinkOrders = useCallback(() => {
        if (!isIvan) {
            return;
        }
        setWithoutLinkDialogOpen(true);
    }, [isIvan]);

    const onOpenOrderDetails = useCallback((orderId) => {
        const numericId = Number(orderId);
        if (!Number.isInteger(numericId) || numericId <= 0) {
            return;
        }
        window.open(`#/orders/${numericId}/show`, '_blank', 'noopener,noreferrer');
    }, []);

    if (loading) {
        return <Typography>Загрузка бухгалтерии...</Typography>;
    }

    return (
        <Stack spacing={2.25} sx={pageStackSx}>
            <Box sx={heroSx}>
                <Stack spacing={1.6}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
                        <Box>
                            <Typography variant="h5">Бухгалтерия</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Контроль прихода, расходов и счетов по выбранному периоду
                            </Typography>
                        </Box>
                        <Chip
                            icon={<ReceiptLongOutlinedIcon fontSize="small" />}
                            label={`${summary.ordersCount || 0} оплат`}
                            sx={{ bgcolor: 'rgba(15, 120, 84, 0.12)', border: '1px solid rgba(16,40,29,0.15)' }}
                        />
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        {periodOptions.map((option) => (
                            <Button
                                key={option.id}
                                variant={period === option.id ? 'contained' : 'outlined'}
                                onClick={() => setPeriod(option.id)}
                                sx={{ borderRadius: 999, px: 2.1, minWidth: 'auto' }}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </Stack>
                </Stack>
            </Box>

            <Box sx={summaryGridSx}>
                <Card sx={metricCardSx}>
                    <CardContent>
                        <Stack spacing={0.85}>
                            <Typography variant="body2" color="text.secondary">
                                Приход
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.8}>
                                <PaidOutlinedIcon fontSize="small" color="success" />
                                <Typography variant="h5">{formatMoney(summary.ordersTotal)}</Typography>
                            </Stack>
                            <Chip size="small" color="success" variant="outlined" label={`${summary.ordersCount || 0} оплаченных`} sx={{ alignSelf: 'flex-start' }} />
                        </Stack>
                    </CardContent>
                </Card>
                <Card sx={metricCardSx}>
                    <CardContent>
                        <Stack spacing={0.85}>
                            <Typography variant="body2" color="text.secondary">
                                Расход
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.8}>
                                <TrendingDownOutlinedIcon fontSize="small" color="warning" />
                                <Typography variant="h5">{formatMoney(summary.expensesTotal)}</Typography>
                            </Stack>
                            <Chip size="small" color="warning" variant="outlined" label={`${summary.expensesCount || 0} расходов`} sx={{ alignSelf: 'flex-start' }} />
                        </Stack>
                    </CardContent>
                </Card>
                <Card sx={metricCardSx}>
                    <CardContent>
                        <Stack spacing={0.85}>
                            <Typography variant="body2" color="text.secondary">
                                Остаток
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.8}>
                                <AccountBalanceWalletOutlinedIcon fontSize="small" color="primary" />
                                <Typography variant="h5">{formatMoney(summary.balance)}</Typography>
                            </Stack>
                            <Chip
                                size="small"
                                color={marginPercent >= 0 ? 'success' : 'error'}
                                variant="outlined"
                                label={`Маржа ${marginPercent}%`}
                                sx={{ alignSelf: 'flex-start' }}
                            />
                        </Stack>
                    </CardContent>
                </Card>
            </Box>

            <Box sx={insightGridSx}>
                <Card sx={insightCardSx}>
                    <CardContent sx={{ p: '0 !important' }}>
                        <Typography variant="subtitle2">Доля расходов от прихода</Typography>
                        <Typography variant="h6" sx={{ mt: 0.35 }}>
                            {Math.round(expenseShare)}%
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={expenseShare}
                            sx={{
                                mt: 1.2,
                                height: 9,
                                borderRadius: 999,
                                bgcolor: 'rgba(16,40,29,0.08)',
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 999,
                                    background: 'linear-gradient(90deg, #f3a145, #de6e2a)'
                                }
                            }}
                        />
                    </CardContent>
                </Card>
                <Card sx={insightCardSx}>
                    <CardContent sx={{ p: '0 !important' }}>
                        <Typography variant="subtitle2">Средний оплаченный заказ</Typography>
                        <Typography variant="h6" sx={{ mt: 0.35 }}>
                            {formatMoney(averageOrderValue)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
                            {paidOrdersCount > 0
                                ? `${paidOrdersCount} заказов за период`
                                : 'Нет оплаченных заказов за выбранный период'}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            <Paper sx={sectionSx}>
                <Box sx={sectionTitleRowSx}>
                    <Typography variant="h6">Распределение прихода по счетам</Typography>
                    <Chip size="small" label={`${accountFinancialRows.length} счетов`} />
                </Box>
                {!accountFinancialRows.length ? (
                    <Box sx={emptyStateSx}>Нет данных по счетам за выбранный период</Box>
                ) : isSmall ? (
                    <Stack spacing={1.2}>
                        {accountFinancialRows.map((item) => (
                            <Card
                                key={item.accountName}
                                variant="outlined"
                                sx={{
                                    ...mobileCardSx,
                                    ...(isIvan && item.accountName === WITHOUT_LINK_ACCOUNT_NAME
                                        ? { cursor: 'pointer', borderColor: 'rgba(16,40,29,0.3)' }
                                        : {})
                                }}
                                onClick={
                                    isIvan && item.accountName === WITHOUT_LINK_ACCOUNT_NAME ? onOpenWithoutLinkOrders : undefined
                                }
                            >
                                <CardContent>
                                    <Typography variant="subtitle2">{item.accountName}</Typography>
                                    <Typography variant="body2">Пришло: {formatMoney(item.income)}</Typography>
                                    <Typography variant="body2">Потрачено: {formatMoney(item.expenses)}</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        Сейчас: {formatMoney(item.current)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                ) : (
                    <Box sx={tableWrapSx}>
                        <Table size="small" sx={tableSx}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Счет</TableCell>
                                    <TableCell align="right">Пришло</TableCell>
                                    <TableCell align="right">Потрачено</TableCell>
                                    <TableCell align="right">Сейчас</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {accountFinancialRows.map((item) => (
                                    <TableRow
                                        key={item.accountName}
                                        hover={isIvan && item.accountName === WITHOUT_LINK_ACCOUNT_NAME}
                                        onClick={
                                            isIvan && item.accountName === WITHOUT_LINK_ACCOUNT_NAME
                                                ? onOpenWithoutLinkOrders
                                                : undefined
                                        }
                                        sx={
                                            isIvan && item.accountName === WITHOUT_LINK_ACCOUNT_NAME
                                                ? { cursor: 'pointer' }
                                                : undefined
                                        }
                                    >
                                        <TableCell
                                            sx={
                                                isIvan && item.accountName === WITHOUT_LINK_ACCOUNT_NAME
                                                    ? { textDecoration: 'underline' }
                                                    : undefined
                                            }
                                        >
                                            {item.accountName}
                                        </TableCell>
                                        <TableCell align="right">{formatMoney(item.income)}</TableCell>
                                        <TableCell align="right">{formatMoney(item.expenses)}</TableCell>
                                        <TableCell align="right">{formatMoney(item.current)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Paper>

            {isIvan ? (
                <Dialog open={withoutLinkDialogOpen} onClose={() => setWithoutLinkDialogOpen(false)} maxWidth="lg" fullWidth>
                    <DialogTitle>Заказы со счетом «Без ссылки»</DialogTitle>
                    <DialogContent>
                        {!withoutLinkOrders.length ? (
                            <Box sx={emptyStateSx}>Заказы без ссылки за выбранный период не найдены</Box>
                        ) : (
                            <Box sx={tableWrapSx}>
                                <Table size="small" sx={{ ...tableSx, minWidth: 980 }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>ID</TableCell>
                                            <TableCell>Дата</TableCell>
                                            <TableCell>Клиент</TableCell>
                                            <TableCell>Телефон</TableCell>
                                            <TableCell>Статус</TableCell>
                                            <TableCell>ИИН продавца</TableCell>
                                            <TableCell align="right">Сумма</TableCell>
                                            <TableCell align="right">Детали</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {withoutLinkOrders.map((order) => {
                                            const numericOrderId = Number(order.id);
                                            const hasOrderCard = Number.isInteger(numericOrderId) && numericOrderId > 0;
                                            return (
                                                <TableRow key={order.id}>
                                                    <TableCell>{order.id}</TableCell>
                                                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                                                    <TableCell>{order.customerName || '-'}</TableCell>
                                                    <TableCell>{order.phoneNumber ? `+7${order.phoneNumber}` : '-'}</TableCell>
                                                    <TableCell>{order.status || '-'}</TableCell>
                                                    <TableCell>{order.paymentSellerIin || '-'}</TableCell>
                                                    <TableCell align="right">{formatMoney(order.totalPrice)}</TableCell>
                                                    <TableCell align="right">
                                                        {hasOrderCard ? (
                                                            <Button size="small" onClick={() => onOpenOrderDetails(order.id)}>
                                                                Открыть заказ
                                                            </Button>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </DialogContent>
                </Dialog>
            ) : null}

            <Paper sx={sectionSx}>
                <Box sx={sectionTitleRowSx}>
                    <Typography variant="h6">Расходы</Typography>
                    <Chip size="small" label={`${summary.expensesCount || expenses.length || 0} записей`} />
                </Box>
                {!expenses.length ? (
                    <Box sx={emptyStateSx}>За выбранный период расходов нет</Box>
                ) : isSmall ? (
                    <Stack spacing={1.2}>
                        {expenses.map((expense) => (
                            <Card key={expense.id} variant="outlined" sx={mobileCardSx}>
                                <CardContent>
                                    <Typography variant="subtitle2">{expense.category}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {formatDate(expense.spentAt)}
                                    </Typography>
                                    <Typography variant="body2">Кто потратил: {expense.spentByName || '-'}</Typography>
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
                    <Box sx={tableWrapSx}>
                        <Table size="small" sx={{ ...tableSx, minWidth: 860 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Дата</TableCell>
                                    <TableCell>Кто потратил</TableCell>
                                    <TableCell>Категория</TableCell>
                                    <TableCell>Комментарий</TableCell>
                                    <TableCell align="right">Сумма</TableCell>
                                    <TableCell align="right">Действие</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{formatDate(expense.spentAt)}</TableCell>
                                        <TableCell>{expense.spentByName || '-'}</TableCell>
                                        <TableCell>{expense.category || '-'}</TableCell>
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

            <Paper sx={sectionSx}>
                <Box sx={sectionTitleRowSx}>
                    <Typography variant="h6">Оплаченные связи клиент-ссылка</Typography>
                    <Chip size="small" label={`${orders.length} заказов`} />
                </Box>
                {!ordersToShow.length ? (
                    <Box sx={emptyStateSx}>Оплаченные заказы за этот период не найдены</Box>
                ) : isSmall ? (
                    <Stack spacing={1.2}>
                        {ordersToShow.map((order) => (
                            <Card key={order.id} variant="outlined" sx={mobileCardSx}>
                                <CardContent>
                                    <Typography variant="subtitle2">Заказ #{order.id}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {formatDate(order.createdAt)}
                                    </Typography>
                                    <Typography variant="body2">Клиент: {order.customerName || '-'}</Typography>
                                    <Typography variant="body2">Город: {order.city || '-'}</Typography>
                                    <Typography variant="body2">Статус: {order.status || '-'}</Typography>
                                    <Typography variant="body2">Счет: {order.accountName || 'Без ссылки'}</Typography>
                                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                                        {formatMoney(order.totalPrice)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                ) : (
                    <Box sx={tableWrapSx}>
                        <Table size="small" sx={{ ...tableSx, minWidth: 860 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    <TableCell>Дата</TableCell>
                                    <TableCell>Клиент</TableCell>
                                    <TableCell>Город</TableCell>
                                    <TableCell>Статус</TableCell>
                                    <TableCell>Счет</TableCell>
                                    <TableCell align="right">Сумма</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ordersToShow.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>{order.id}</TableCell>
                                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                                        <TableCell>{order.customerName || '-'}</TableCell>
                                        <TableCell>{order.city || '-'}</TableCell>
                                        <TableCell>{order.status || '-'}</TableCell>
                                        <TableCell>{order.accountName || 'Без ссылки'}</TableCell>
                                        <TableCell align="right">{formatMoney(order.totalPrice)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
                {hasHiddenOrders ? (
                    <Box sx={{ mt: 1.6 }}>
                        <Button variant="outlined" onClick={() => setShowAllOrders((prev) => !prev)} sx={{ borderRadius: 999 }}>
                            {showAllOrders ? 'Скрыть лишние заказы' : 'Смотреть все заказы'}
                        </Button>
                    </Box>
                ) : null}
            </Paper>
        </Stack>
    );
};

export default AccountingPage;
