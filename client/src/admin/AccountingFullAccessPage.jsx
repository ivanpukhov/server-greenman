import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
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
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';
import {
    emptyStateSx,
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
    const totalIncome = Number(summary.accountFinancials?.totalIncome || 0);
    const totalExpenses = Number(summary.accountFinancials?.totalExpenses || 0);
    const totalCurrent = Number(summary.accountFinancials?.totalCurrent || 0);
    const expenseLoad = totalIncome > 0 ? Math.min(100, Math.max(0, (totalExpenses / totalIncome) * 100)) : 0;
    const topAccount = byAccount.reduce((acc, item) => {
        if (!acc || Number(item.current || 0) > Number(acc.current || 0)) {
            return item;
        }
        return acc;
    }, null);

    return (
        <Stack spacing={2.25} sx={pageStackSx}>
            <Box sx={heroSx}>
                <Stack spacing={1.6}>
                    <Box>
                        <Typography variant="h5">Полная сводка счетов</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Просмотр финансов по всем счетам без ограничений
                        </Typography>
                    </Box>
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
                                Общий доход
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.8}>
                                <PaidOutlinedIcon fontSize="small" color="success" />
                                <Typography variant="h5">{formatMoney(summary.accountFinancials?.totalIncome || 0)}</Typography>
                            </Stack>
                            <Chip size="small" color="success" variant="outlined" label={`${byAccount.length} счетов в отчете`} sx={{ alignSelf: 'flex-start' }} />
                        </Stack>
                    </CardContent>
                </Card>
                <Card sx={metricCardSx}>
                    <CardContent>
                        <Stack spacing={0.85}>
                            <Typography variant="body2" color="text.secondary">
                                Общий расход
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.8}>
                                <TrendingDownOutlinedIcon fontSize="small" color="warning" />
                                <Typography variant="h5">{formatMoney(summary.accountFinancials?.totalExpenses || 0)}</Typography>
                            </Stack>
                            <Chip size="small" color="warning" variant="outlined" label={`Нагрузка ${Math.round(expenseLoad)}%`} sx={{ alignSelf: 'flex-start' }} />
                        </Stack>
                    </CardContent>
                </Card>
                <Card sx={metricCardSx}>
                    <CardContent>
                        <Stack spacing={0.85}>
                            <Typography variant="body2" color="text.secondary">
                                Сейчас на счетах
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.8}>
                                <AccountBalanceWalletOutlinedIcon fontSize="small" color="primary" />
                                <Typography variant="h5">{formatMoney(summary.accountFinancials?.totalCurrent || 0)}</Typography>
                            </Stack>
                            <Chip
                                size="small"
                                color={totalCurrent >= 0 ? 'success' : 'error'}
                                variant="outlined"
                                label={totalCurrent >= 0 ? 'Позитивный баланс' : 'Отрицательный баланс'}
                                sx={{ alignSelf: 'flex-start' }}
                            />
                        </Stack>
                    </CardContent>
                </Card>
            </Box>

            <Box sx={insightGridSx}>
                <Card sx={insightCardSx}>
                    <CardContent sx={{ p: '0 !important' }}>
                        <Typography variant="subtitle2">Расходная нагрузка</Typography>
                        <Typography variant="h6" sx={{ mt: 0.35 }}>
                            {Math.round(expenseLoad)}%
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={expenseLoad}
                            sx={{
                                mt: 1.2,
                                height: 6,
                                borderRadius: 999,
                                bgcolor: (t) => t.palette.action.hover,
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 999,
                                    backgroundColor: 'warning.main'
                                }
                            }}
                        />
                    </CardContent>
                </Card>
                <Card sx={insightCardSx}>
                    <CardContent sx={{ p: '0 !important' }}>
                        <Typography variant="subtitle2">Лидер по остатку</Typography>
                        <Typography variant="h6" sx={{ mt: 0.35 }}>
                            {topAccount?.accountName || 'Нет данных'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
                            {topAccount ? formatMoney(topAccount.current) : 'Данные отсутствуют за период'}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            <Paper sx={sectionSx}>
                <Box sx={sectionTitleRowSx}>
                    <Typography variant="h6">По каждому счету</Typography>
                    <Chip size="small" label={`${byAccount.length} счетов`} />
                </Box>
                {!byAccount.length ? (
                    <Box sx={emptyStateSx}>По выбранному периоду данные отсутствуют</Box>
                ) : isSmall ? (
                    <Stack spacing={1.2}>
                        {byAccount.map((item) => (
                            <Card key={item.accountName} variant="outlined" sx={mobileCardSx}>
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
