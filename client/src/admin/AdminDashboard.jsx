import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Grid,
    Stack,
    Typography
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useCreatePath, useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const periodLabels = {
    today: 'Сегодня',
    week: 'За неделю',
    month: 'За месяц',
    year: 'За год'
};

const formatMoney = (value) =>
    `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(value || 0))} ₸`;

const metricCardSx = {
    height: '100%',
    border: '1px solid rgba(16,40,29,0.08)',
    background: 'linear-gradient(155deg, rgba(255,255,255,0.98), rgba(244,251,247,0.96))',
    boxShadow: '0 12px 26px rgba(16,40,29,0.08)',
    transition: 'transform 160ms ease, box-shadow 160ms ease',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 18px 34px rgba(16,40,29,0.12)'
    }
};

const chartColors = {
    turnover: '#10a778',
    expenses: '#d96a7c',
    profit: '#247d63',
    orders: '#2c7ed6'
};

const toChartSafeId = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-');

const buildSmoothPath = (points = []) => {
    if (!points.length) {
        return '';
    }
    if (points.length === 1) {
        return `M ${points[0].x} ${points[0].y}`;
    }

    return points.reduce((acc, point, index) => {
        if (index === 0) {
            return `M ${point.x} ${point.y}`;
        }
        const prev = points[index - 1];
        const cp1x = prev.x + (point.x - prev.x) / 2;
        const cp1y = prev.y;
        const cp2x = prev.x + (point.x - prev.x) / 2;
        const cp2y = point.y;
        return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
    }, '');
};

const useElementSize = () => {
    const elementRef = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const element = elementRef.current;
        if (!element || typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) {
                return;
            }
            const nextWidth = Math.max(0, Math.floor(entry.contentRect.width));
            setSize({ width: nextWidth, height: Math.floor(entry.contentRect.height) });
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return { elementRef, width: Math.max(1, size.width) };
};

const pickLabelIndices = (total, maxTicks = 7) => {
    if (total <= maxTicks) {
        return new Set(Array.from({ length: total }, (_, i) => i));
    }

    const step = Math.ceil(total / maxTicks);
    const points = new Set([0, total - 1]);
    for (let i = step; i < total - 1; i += step) {
        points.add(i);
    }
    return points;
};

const InteractiveLineChart = ({ title, subtitle, labels, series, formatValue }) => {
    const { elementRef, width } = useElementSize();
    const [activeIndex, setActiveIndex] = useState(null);

    const height = 280;
    const padding = { top: 16, right: 14, bottom: 48, left: 14 };
    const pointCount = labels.length;

    const geometry = useMemo(() => {
        if (!pointCount) {
            return null;
        }

        const innerWidth = Math.max(1, width - padding.left - padding.right);
        const innerHeight = Math.max(1, height - padding.top - padding.bottom);

        const allValues = series.flatMap((line) => line.values).map((value) => Number(value || 0));
        const minValue = Math.min(...allValues, 0);
        const maxValue = Math.max(...allValues, 1);
        const range = Math.max(1, maxValue - minValue);

        const xForIndex = (index) =>
            padding.left + (pointCount === 1 ? innerWidth / 2 : (innerWidth * index) / (pointCount - 1));
        const yForValue = (value) => padding.top + ((maxValue - Number(value || 0)) / range) * innerHeight;

        const lines = series.map((line) => {
            const points = line.values.map((value, index) => ({ x: xForIndex(index), y: yForValue(value), value: Number(value || 0) }));
            const path = buildSmoothPath(points);
            const areaPath = points.length
                ? `${path} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
                : '';

            return {
                ...line,
                points,
                path,
                areaPath
            };
        });

        return {
            minValue,
            maxValue,
            lines,
            xForIndex
        };
    }, [height, labels.length, padding.bottom, padding.left, padding.right, padding.top, pointCount, series, width]);

    useEffect(() => {
        if (activeIndex === null) {
            return;
        }
        if (activeIndex > labels.length - 1) {
            setActiveIndex(labels.length - 1);
        }
    }, [activeIndex, labels.length]);

    const onMove = (clientX, rectLeft) => {
        if (!geometry || pointCount <= 0) {
            return;
        }

        const relativeX = clientX - rectLeft;
        const innerWidth = Math.max(1, width - padding.left - padding.right);
        const clamped = Math.max(0, Math.min(innerWidth, relativeX - padding.left));
        const index = pointCount === 1 ? 0 : Math.round((clamped / innerWidth) * (pointCount - 1));
        setActiveIndex(Math.max(0, Math.min(pointCount - 1, index)));
    };

    const labelTickIndices = pickLabelIndices(pointCount, width < 420 ? 4 : 7);

    const idBase = toChartSafeId(title);
    const yAxisLabels = geometry
        ? [geometry.maxValue, geometry.maxValue * 0.75, geometry.maxValue * 0.5, geometry.maxValue * 0.25, geometry.minValue]
        : [];

    return (
        <Card sx={{ ...metricCardSx, overflow: 'hidden' }}>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {subtitle}
                </Typography>

                <Box
                    ref={elementRef}
                    sx={{ position: 'relative', width: '100%', touchAction: 'none', overflow: 'hidden' }}
                    onMouseLeave={() => setActiveIndex(null)}
                    onMouseMove={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        onMove(event.clientX, rect.left);
                    }}
                    onTouchMove={(event) => {
                        const touch = event.touches[0];
                        if (!touch) {
                            return;
                        }
                        const rect = event.currentTarget.getBoundingClientRect();
                        onMove(touch.clientX, rect.left);
                    }}
                    onTouchStart={(event) => {
                        const touch = event.touches[0];
                        if (!touch) {
                            return;
                        }
                        const rect = event.currentTarget.getBoundingClientRect();
                        onMove(touch.clientX, rect.left);
                    }}
                >
                    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={title}>
                        <defs>
                            {series.map((line) => (
                                <linearGradient key={`area-${line.key}`} id={`${idBase}-${line.key}-area`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={line.color} stopOpacity="0.26" />
                                    <stop offset="100%" stopColor={line.color} stopOpacity="0.02" />
                                </linearGradient>
                            ))}
                        </defs>

                        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
                            const y = padding.top + (height - padding.top - padding.bottom) * step;
                            return (
                                <line
                                    key={`grid-${step}`}
                                    x1={padding.left}
                                    y1={y}
                                    x2={width - padding.right}
                                    y2={y}
                                    stroke="rgba(16,40,29,0.08)"
                                />
                            );
                        })}

                        {yAxisLabels.map((value, index) => (
                            <text
                                key={`y-axis-${index}`}
                                x={width - padding.right}
                                y={padding.top + (height - padding.top - padding.bottom) * (index / 4) - 4}
                                fontSize="10"
                                textAnchor="end"
                                fill="#6a8578"
                            >
                                {formatValue(value)}
                            </text>
                        ))}

                        <line
                            x1={padding.left}
                            y1={height - padding.bottom}
                            x2={width - padding.right}
                            y2={height - padding.bottom}
                            stroke="rgba(16,40,29,0.2)"
                        />

                        {geometry?.lines.map((line) => (
                            <g key={line.key}>
                                {line.areaPath ? <path d={line.areaPath} fill={`url(#${idBase}-${line.key}-area)`} /> : null}
                                <path d={line.path} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinecap="round" />
                                {activeIndex !== null && line.points[activeIndex] ? (
                                    <circle cx={line.points[activeIndex].x} cy={line.points[activeIndex].y} r="4" fill={line.color} />
                                ) : null}
                            </g>
                        ))}

                        {labels.map((label, index) => {
                            if (!labelTickIndices.has(index) || !geometry) {
                                return null;
                            }
                            return (
                                <text
                                    key={`label-${label}-${index}`}
                                    x={geometry.xForIndex(index)}
                                    y={height - padding.bottom + 18}
                                    fontSize="11"
                                    textAnchor="middle"
                                    fill="#5d7b6f"
                                >
                                    {label}
                                </text>
                            );
                        })}

                        {activeIndex !== null && geometry ? (
                            <line
                                x1={geometry.xForIndex(activeIndex)}
                                y1={padding.top}
                                x2={geometry.xForIndex(activeIndex)}
                                y2={height - padding.bottom}
                                stroke="rgba(16,40,29,0.18)"
                                strokeDasharray="4 4"
                            />
                        ) : null}
                    </svg>

                    {activeIndex !== null && geometry ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                zIndex: 2,
                                px: 1.2,
                                py: 0.8,
                                borderRadius: 1.6,
                                backgroundColor: 'rgba(249,255,252,0.94)',
                                border: '1px solid rgba(16,40,29,0.15)',
                                boxShadow: '0 10px 20px rgba(16,40,29,0.12)',
                                minWidth: 120
                            }}
                        >
                            <Typography variant="caption" sx={{ color: '#39584c', fontWeight: 700 }}>
                                {labels[activeIndex]}
                            </Typography>
                            <Stack spacing={0.3} sx={{ mt: 0.4 }}>
                                {geometry.lines.map((line) => (
                                    <Stack key={`tooltip-${line.key}`} direction="row" justifyContent="space-between" spacing={1}>
                                        <Typography variant="caption" sx={{ color: line.color, fontWeight: 700 }}>
                                            {line.label}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#243b31' }}>
                                            {formatValue(line.points[activeIndex]?.value || 0)}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Box>
                    ) : null}
                </Box>

                <Stack direction="row" spacing={1.5} sx={{ mt: 1.2 }} flexWrap="wrap" useFlexGap>
                    {series.map((line) => (
                        <Stack key={`legend-${line.key}`} direction="row" spacing={0.7} alignItems="center">
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: line.color }} />
                            <Typography variant="caption" color="text.secondary">
                                {line.label}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );
};

const ProductSalesChart = ({ rows }) => {
    const maxCount = rows.reduce((max, row) => Math.max(max, Number(row.count || 0)), 1);

    return (
        <Card sx={metricCardSx}>
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.4 }}>
                    <BarChartOutlinedIcon />
                    <Typography variant="h6">Продажи товаров за период</Typography>
                </Stack>
                {!rows.length ? (
                    <Typography variant="body2" color="text.secondary">
                        Нет данных за выбранный период
                    </Typography>
                ) : (
                    <Stack spacing={1.1}>
                        {rows.map((row, index) => {
                            const widthPercent = Math.max(4, Math.round((Number(row.count || 0) / maxCount) * 100));
                            return (
                                <Box key={`${row.name}-${index}`}>
                                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {row.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {row.count} шт.
                                        </Typography>
                                    </Stack>
                                    <Box
                                        sx={{
                                            mt: 0.5,
                                            height: 8,
                                            width: '100%',
                                            borderRadius: 5,
                                            backgroundColor: 'rgba(16,40,29,0.08)'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                height: '100%',
                                                width: `${widthPercent}%`,
                                                borderRadius: 5,
                                                background: 'linear-gradient(90deg, #1f9a60, #2c7ed6)'
                                            }}
                                        />
                                    </Box>
                                </Box>
                            );
                        })}
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
};

const FinancialSummaryPanel = ({ periodLabel, financialSummary, accountFinancials, loading }) => {
    const rows = Array.isArray(accountFinancials?.byAccount) ? accountFinancials.byAccount : [];

    return (
        <Card
            sx={{
                ...metricCardSx,
                background:
                    'radial-gradient(circle at 15% 10%, rgba(38,173,124,0.2), transparent 35%), linear-gradient(150deg, rgba(8,68,48,0.96), rgba(14,95,67,0.92))',
                color: '#eefaf4',
                border: '1px solid rgba(193,244,220,0.22)'
            }}
        >
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h6">Финансовая сводка</Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(233,251,243,0.86)' }}>
                                {periodLabel}
                            </Typography>
                        </Box>
                        {loading ? <CircularProgress size={18} sx={{ color: '#eefaf4' }} /> : null}
                    </Stack>

                    <Grid container spacing={1.2}>
                        <Grid item xs={12} sm={4}>
                            <Card sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'inherit' }}>
                                <CardContent sx={{ py: 1.2, '&:last-child': { pb: 1.2 } }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(233,251,243,0.82)' }}>
                                        Общий доход
                                    </Typography>
                                    <Typography variant="h6">{formatMoney(financialSummary.revenue)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Card sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'inherit' }}>
                                <CardContent sx={{ py: 1.2, '&:last-child': { pb: 1.2 } }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(233,251,243,0.82)' }}>
                                        Общий расход
                                    </Typography>
                                    <Typography variant="h6">{formatMoney(financialSummary.expenses)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Card sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'inherit' }}>
                                <CardContent sx={{ py: 1.2, '&:last-child': { pb: 1.2 } }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(233,251,243,0.82)' }}>
                                        Сейчас
                                    </Typography>
                                    <Typography variant="h6">{formatMoney(financialSummary.profit)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Box
                        sx={{
                            borderRadius: 2,
                            border: '1px solid rgba(220,255,240,0.2)',
                            bgcolor: 'rgba(255,255,255,0.05)',
                            overflow: 'hidden'
                        }}
                    >
                        <Box
                            sx={{
                                px: 1.5,
                                py: 1,
                                display: 'grid',
                                gridTemplateColumns: { xs: '1.3fr 1fr', md: '1.3fr 1fr 1fr 1fr' },
                                gap: 1,
                                borderBottom: '1px solid rgba(220,255,240,0.16)'
                            }}
                        >
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                Счет
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'right' }}>
                                Пришло
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                                Потрачено
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                                Сейчас
                            </Typography>
                        </Box>

                        <Stack spacing={0}>
                            {rows.slice(0, 8).map((item, index) => (
                                <Box
                                    key={`${item.accountName}-${index}`}
                                    sx={{
                                        px: 1.5,
                                        py: 1,
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1.3fr 1fr', md: '1.3fr 1fr 1fr 1fr' },
                                        gap: 1,
                                        borderBottom:
                                            index < rows.slice(0, 8).length - 1
                                                ? '1px solid rgba(220,255,240,0.12)'
                                                : 'none'
                                    }}
                                >
                                    <Typography variant="body2">{item.accountName}</Typography>
                                    <Typography variant="body2" sx={{ textAlign: 'right' }}>
                                        {formatMoney(item.income)}
                                    </Typography>
                                    <Typography variant="body2" sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                                        {formatMoney(item.expenses)}
                                    </Typography>
                                    <Typography variant="body2" sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                                        {formatMoney(item.current)}
                                    </Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

const useDashboardAnalytics = (period) => {
    const [data, setData] = useState({
        productSales: [],
        financialSummary: {
            revenue: 0,
            expenses: 0,
            profit: 0,
            ordersCount: 0
        },
        accountFinancials: {
            totalIncome: 0,
            totalExpenses: 0,
            totalCurrent: 0,
            byAccount: []
        },
        orderSeries: { today: [], week: [], month: [], year: [] },
        financeSeries: { today: [], week: [], month: [], year: [] }
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
                        productSales: Array.isArray(body?.data?.productSales)
                            ? body.data.productSales
                            : (Array.isArray(body?.data?.topProducts) ? body.data.topProducts : []),
                        financialSummary: body?.data?.financialSummary || { revenue: 0, expenses: 0, profit: 0, ordersCount: 0 },
                        accountFinancials: body?.data?.accountFinancials || {
                            totalIncome: 0,
                            totalExpenses: 0,
                            totalCurrent: 0,
                            byAccount: []
                        },
                        orderSeries: body?.data?.orderSeries || { today: [], week: [], month: [], year: [] },
                        financeSeries: body?.data?.financeSeries || { today: [], week: [], month: [], year: [] }
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
    const createPath = useCreatePath();
    const { data: analytics, loading } = useDashboardAnalytics(period);

    const orderChartData = useMemo(() => {
        const points = analytics.orderSeries?.[period] || [];
        return {
            labels: points.map((point) => point.label),
            lines: [
                {
                    key: 'orders',
                    label: 'Оплаченные связи',
                    color: chartColors.orders,
                    values: points.map((point) => Number(point.orders || 0))
                }
            ]
        };
    }, [analytics.orderSeries, period]);

    const financeChartData = useMemo(() => {
        const points = analytics.financeSeries?.[period] || [];
        return {
            labels: points.map((point) => point.label),
            lines: [
                {
                    key: 'turnover',
                    label: 'Оборот',
                    color: chartColors.turnover,
                    values: points.map((point) => Number(point.turnover || 0))
                },
                {
                    key: 'expenses',
                    label: 'Расход',
                    color: chartColors.expenses,
                    values: points.map((point) => Number(point.expenses || 0))
                },
                {
                    key: 'profit',
                    label: 'Прибыль',
                    color: chartColors.profit,
                    values: points.map((point) => Number(point.profit || 0))
                }
            ]
        };
    }, [analytics.financeSeries, period]);

    return (
        <Stack spacing={2.5}>
            <Box
                sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 2.5,
                    border: '1px solid rgba(16,40,29,0.1)',
                    boxShadow: '0 10px 22px rgba(16,40,29,0.08)',
                    background: 'rgba(248,253,250,0.96)'
                }}
            >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
                    <Box>
                        <Typography variant="h5" sx={{ mb: 0.8, fontWeight: 760 }}>
                            Оперативная панель
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 620 }}>
                            Наглядная аналитика: динамика оплаченных связей, оборот, расходы и остаток в одном экране.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {Object.entries(periodLabels).map(([key, label]) => (
                            <Button
                                key={key}
                                variant={period === key ? 'contained' : 'outlined'}
                                onClick={() => setPeriod(key)}
                                sx={{ minWidth: 108 }}
                            >
                                {label}
                            </Button>
                        ))}
                    </Stack>
                </Stack>
            </Box>

            <FinancialSummaryPanel
                periodLabel={`${periodLabels[period]} · ${Number(analytics.financialSummary.ordersCount || 0)} оплаченных связей`}
                financialSummary={analytics.financialSummary || { revenue: 0, expenses: 0, profit: 0 }}
                accountFinancials={analytics.accountFinancials || { byAccount: [] }}
                loading={loading}
            />

            <InteractiveLineChart
                title="Количество оплаченных связей клиент-ссылка"
                subtitle="Наведите курсор или коснитесь графика, чтобы увидеть значения"
                labels={orderChartData.labels}
                series={orderChartData.lines}
                formatValue={(value) => String(Math.round(Number(value || 0)))}
            />

            <InteractiveLineChart
                title="Оборот, расход, прибыль"
                subtitle="Три интерактивные линии по выбранному периоду"
                labels={financeChartData.labels}
                series={financeChartData.lines}
                formatValue={(value) => formatMoney(value)}
            />

            <ProductSalesChart rows={analytics.productSales || []} />

            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <Card sx={metricCardSx}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                Быстрые действия
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                                <Button component={RouterLink} to={createPath({ resource: 'orders', type: 'list' })} variant="contained">
                                    Заказы
                                </Button>
                                <Button component={RouterLink} to={createPath({ resource: 'products', type: 'list' })} variant="outlined">
                                    Товары
                                </Button>
                                <Button component={RouterLink} to={createPath({ resource: 'accounting', type: 'list' })} variant="outlined">
                                    Бухгалтерия
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card sx={metricCardSx}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                Склад и QR
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Button component={RouterLink} to={createPath({ resource: 'incoming', type: 'list' })} variant="contained">
                                    Приход
                                </Button>
                                <Button component={RouterLink} to={createPath({ resource: 'qr-codes', type: 'list' })} variant="outlined">
                                    QR-коды
                                </Button>
                                <Button component={RouterLink} to={createPath({ resource: 'add-expense', type: 'list' })} variant="outlined">
                                    Добавить расход
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
