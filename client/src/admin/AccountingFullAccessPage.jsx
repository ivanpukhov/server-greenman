import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
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

const periodOptions = [
    { id: 'today', label: 'Сегодня' },
    { id: 'yesterday', label: 'Вчера' },
    { id: 'week', label: 'Неделя' },
    { id: 'month', label: 'Месяц' },
    { id: 'halfyear', label: 'Полгода' }
];

const AccountingFullAccessPage = () => {
    const notify = useNotify();
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('md'));
    const [period, setPeriod] = useState('month');
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        accountFinancials: {
            totalIncome: 0,
            totalExpenses: 0,
            totalCurrent: 0,
            byAccount: []
        }
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl(`/admin/accounting/full-summary?period=${encodeURIComponent(period)}`), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(body.message || 'Не удалось загрузить полную сводку');
            }

            setSummary(body.data || {});
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [notify, period]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) {
        return <Typography>Загрузка полной сводки...</Typography>;
    }

    const byAccount = Array.isArray(summary.accountFinancials?.byAccount) ? summary.accountFinancials.byAccount : [];

    return (
        <Stack spacing={2.5}>
            <Box
                sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 2.5,
                    border: '1px solid rgba(16,40,29,0.08)',
                    background: 'rgba(248,253,250,0.96)'
                }}
            >
                <Typography variant="h5">Полная сводка счетов (Иван)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Включены все счета, включая Иван и Даша.
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

            <Card sx={{ border: '1px solid rgba(16,40,29,0.08)', boxShadow: '0 12px 32px rgba(16,40,29,0.09)' }}>
                <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Общий доход
                            </Typography>
                            <Typography variant="h5">{formatMoney(summary.accountFinancials?.totalIncome || 0)}</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Общий расход
                            </Typography>
                            <Typography variant="h5">{formatMoney(summary.accountFinancials?.totalExpenses || 0)}</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Сейчас на счетах
                            </Typography>
                            <Typography variant="h5">{formatMoney(summary.accountFinancials?.totalCurrent || 0)}</Typography>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    По каждому счету
                </Typography>
                {isSmall ? (
                    <Stack spacing={1.2}>
                        {byAccount.map((item) => (
                            <Card key={item.accountName} variant="outlined" sx={{ borderRadius: 2 }}>
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
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 720 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Счёт</TableCell>
                                    <TableCell align="right">Пришло</TableCell>
                                    <TableCell align="right">Потрачено</TableCell>
                                    <TableCell align="right">Сейчас</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {byAccount.map((item) => (
                                    <TableRow key={item.accountName}>
                                        <TableCell>{item.accountName}</TableCell>
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
        </Stack>
    );
};

export default AccountingFullAccessPage;
