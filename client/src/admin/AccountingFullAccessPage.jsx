import { useCallback, useEffect, useState } from 'react';
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
                        <Stack spacing={0.6}>
                            <Typography variant="body2" color="text.secondary">
                                Общий доход
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.8}>
                                <PaidOutlinedIcon fontSize="small" color="success" />
                                <Typography variant="h5">{formatMoney(summary.accountFinancials?.totalIncome || 0)}</Typography>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
                <Card sx={metricCardSx}>
                    <CardContent>
                        <Stack spacing={0.6}>
                            <Typography variant="body2" color="text.secondary">
                                Общий расход
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.8}>
                                <TrendingDownOutlinedIcon fontSize="small" color="warning" />
                                <Typography variant="h5">{formatMoney(summary.accountFinancials?.totalExpenses || 0)}</Typography>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
                <Card sx={metricCardSx}>
                    <CardContent>
                        <Stack spacing={0.6}>
                            <Typography variant="body2" color="text.secondary">
                                Сейчас на счетах
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.8}>
                                <AccountBalanceWalletOutlinedIcon fontSize="small" color="primary" />
                                <Typography variant="h5">{formatMoney(summary.accountFinancials?.totalCurrent || 0)}</Typography>
                            </Stack>
                        </Stack>
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
