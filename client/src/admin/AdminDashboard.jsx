import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import {
    Box,
    Button,
    CircularProgress,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    useMediaQuery
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useCreatePath, useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';
import { PageSection, PageShell } from './_shared/PageShell';
import {
    cardSx,
    formatMoney,
    metricLabelSx,
    metricValueSx,
    summaryGridSx
} from './_shared/tokens';

const periodLabels = {
    today: 'Сегодня',
    week: 'Неделя',
    month: 'Месяц',
    year: 'Год'
};

const PRIMARY = '#1f9a60';
const RED = '#dc2626';
const BLUE = '#2563eb';

const chartColors = {
    turnover: PRIMARY,
    expenses: RED,
    profit: '#0f766e',
    orders: BLUE
};

const toChartSafeId = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-');

const buildSmoothPath = (points = []) => {
    if (!points.length) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    return points.reduce((acc, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prev = points[index - 1];
        const cp1x = prev.x + (point.x - prev.x) / 2;
        const cp2x = prev.x + (point.x - prev.x) / 2;
        return `${acc} C ${cp1x} ${prev.y}, ${cp2x} ${point.y}, ${point.x} ${point.y}`;
    }, '');
};

const useElementSize = () => {
    const elementRef = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const element = elementRef.current;
        if (!element || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            setSize({
                width: Math.max(0, Math.floor(entry.contentRect.width)),
                height: Math.floor(entry.contentRect.height)
            });
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return { elementRef, width: Math.max(1, size.width) };
};

const pickLabelIndices = (total, maxTicks = 7) => {
    if (total <= maxTicks) return new Set(Array.from({ length: total }, (_, i) => i));
    const step = Math.ceil(total / maxTicks);
    const points = new Set([0, total - 1]);
    for (let i = step; i < total - 1; i += step) points.add(i);
    return points;
};

const InteractiveLineChart = ({ title, labels, series, formatValue }) => {
    const { elementRef, width } = useElementSize();
    const [activeIndex, setActiveIndex] = useState(null);

    const height = 240;
    const padding = { top: 16, right: 14, bottom: 36, left: 14 };
    const pointCount = labels.length;

    const geometry = useMemo(() => {
        if (!pointCount) return null;
        const innerWidth = Math.max(1, width - padding.left - padding.right);
        const innerHeight = Math.max(1, height - padding.top - padding.bottom);
        const allValues = series.flatMap((line) => line.values).map((v) => Number(v || 0));
        const minValue = Math.min(...allValues, 0);
        const maxValue = Math.max(...allValues, 1);
        const range = Math.max(1, maxValue - minValue);

        const xForIndex = (index) =>
            padding.left + (pointCount === 1 ? innerWidth / 2 : (innerWidth * index) / (pointCount - 1));
        const yForValue = (value) => padding.top + ((maxValue - Number(value || 0)) / range) * innerHeight;

        const lines = series.map((line) => {
            const points = line.values.map((value, index) => ({
                x: xForIndex(index),
                y: yForValue(value),
                value: Number(value || 0)
            }));
            const path = buildSmoothPath(points);
            const areaPath = points.length
                ? `${path} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${
                      height - padding.bottom
                  } Z`
                : '';
            return { ...line, points, path, areaPath };
        });

        return { minValue, maxValue, lines, xForIndex };
    }, [height, padding.bottom, padding.left, padding.right, padding.top, pointCount, series, width]);

    useEffect(() => {
        if (activeIndex !== null && activeIndex > labels.length - 1) {
            setActiveIndex(labels.length - 1);
        }
    }, [activeIndex, labels.length]);

    const onMove = (clientX, rectLeft) => {
        if (!geometry || pointCount <= 0) return;
        const innerWidth = Math.max(1, width - padding.left - padding.right);
        const clamped = Math.max(0, Math.min(innerWidth, clientX - rectLeft - padding.left));
        const index = pointCount === 1 ? 0 : Math.round((clamped / innerWidth) * (pointCount - 1));
        setActiveIndex(Math.max(0, Math.min(pointCount - 1, index)));
    };

    const labelTickIndices = pickLabelIndices(pointCount, width < 420 ? 4 : 7);
    const idBase = toChartSafeId(title);

    return (
        <Box>
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
                    if (!touch) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    onMove(touch.clientX, rect.left);
                }}
                onTouchStart={(event) => {
                    const touch = event.touches[0];
                    if (!touch) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    onMove(touch.clientX, rect.left);
                }}
            >
                <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={title}>
                    <defs>
                        {series.map((line) => (
                            <linearGradient
                                key={`area-${line.key}`}
                                id={`${idBase}-${line.key}-area`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0%" stopColor={line.color} stopOpacity="0.16" />
                                <stop offset="100%" stopColor={line.color} stopOpacity="0" />
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
                                stroke="rgba(15,23,28,0.06)"
                            />
                        );
                    })}

                    {geometry?.lines.map((line) => (
                        <g key={line.key}>
                            {line.areaPath && <path d={line.areaPath} fill={`url(#${idBase}-${line.key}-area)`} />}
                            <path
                                d={line.path}
                                fill="none"
                                stroke={line.color}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {activeIndex !== null && line.points[activeIndex] && (
                                <circle
                                    cx={line.points[activeIndex].x}
                                    cy={line.points[activeIndex].y}
                                    r="4"
                                    fill="#fff"
                                    stroke={line.color}
                                    strokeWidth="2"
                                />
                            )}
                        </g>
                    ))}

                    {labels.map((label, index) => {
                        if (!labelTickIndices.has(index) || !geometry) return null;
                        return (
                            <text
                                key={`label-${index}`}
                                x={geometry.xForIndex(index)}
                                y={height - padding.bottom + 18}
                                fontSize="11"
                                textAnchor="middle"
                                fill="#5b6b66"
                            >
                                {label}
                            </text>
                        );
                    })}

                    {activeIndex !== null && geometry && (
                        <line
                            x1={geometry.xForIndex(activeIndex)}
                            y1={padding.top}
                            x2={geometry.xForIndex(activeIndex)}
                            y2={height - padding.bottom}
                            stroke="rgba(15,23,28,0.16)"
                            strokeDasharray="3 3"
                        />
                    )}
                </svg>

                {activeIndex !== null && geometry && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 2,
                            px: 1.25,
                            py: 0.75,
                            borderRadius: 1.5,
                            backgroundColor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: '0 6px 16px rgba(15,23,28,0.08)',
                            minWidth: 130
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.72rem' }}
                        >
                            {labels[activeIndex]}
                        </Typography>
                        <Stack spacing={0.4} sx={{ mt: 0.4 }}>
                            {geometry.lines.map((line) => (
                                <Stack
                                    key={`tooltip-${line.key}`}
                                    direction="row"
                                    justifyContent="space-between"
                                    spacing={1}
                                    alignItems="center"
                                >
                                    <Stack direction="row" spacing={0.6} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                backgroundColor: line.color
                                            }}
                                        />
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            {line.label}
                                        </Typography>
                                    </Stack>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.primary',
                                            fontWeight: 600,
                                            fontVariantNumeric: 'tabular-nums'
                                        }}
                                    >
                                        {formatValue(line.points[activeIndex]?.value || 0)}
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Box>
                )}
            </Box>

            <Stack direction="row" spacing={2} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                {series.map((line) => (
                    <Stack key={`legend-${line.key}`} direction="row" spacing={0.7} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: line.color }} />
                        <Typography variant="caption" color="text.secondary">
                            {line.label}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        </Box>
    );
};

const KpiCard = ({ label, value, hint, accent }) => (
    <Box sx={cardSx}>
        <Typography sx={metricLabelSx}>{label}</Typography>
        <Typography sx={{ ...metricValueSx, mt: 0.75, color: accent || 'text.primary' }}>{value}</Typography>
        {hint && (
            <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.25 }}>
                {hint}
            </Typography>
        )}
    </Box>
);

const ProductSalesList = ({ rows }) => {
    const maxCount = rows.reduce((max, row) => Math.max(max, Number(row.count || 0)), 1);
    if (!rows.length) {
        return (
            <Typography variant="body2" color="text.secondary">
                Нет данных за выбранный период
            </Typography>
        );
    }
    return (
        <Stack spacing={1.25}>
            {rows.map((row, index) => {
                const widthPercent = Math.max(2, Math.round((Number(row.count || 0) / maxCount) * 100));
                return (
                    <Box key={`${row.name}-${index}`}>
                        <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 0 }} noWrap>
                                {row.name}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'text.secondary',
                                    fontVariantNumeric: 'tabular-nums',
                                    flexShrink: 0
                                }}
                            >
                                {row.count} шт.
                            </Typography>
                        </Stack>
                        <Box
                            sx={{
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: alpha('#0f1718', 0.06),
                                overflow: 'hidden'
                            }}
                        >
                            <Box
                                sx={{
                                    height: '100%',
                                    width: `${widthPercent}%`,
                                    backgroundColor: 'primary.main',
                                    borderRadius: 2
                                }}
                            />
                        </Box>
                    </Box>
                );
            })}
        </Stack>
    );
};

const AccountsTable = ({ rows }) => {
    if (!rows.length) {
        return (
            <Typography variant="body2" color="text.secondary">
                Нет данных по счетам
            </Typography>
        );
    }
    return (
        <Box
            sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden'
            }}
        >
            <Box
                sx={{
                    px: 1.5,
                    py: 1,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1.3fr 1fr', md: '1.4fr 1fr 1fr 1fr' },
                    gap: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: alpha('#0f1718', 0.025)
                }}
            >
                <Typography sx={metricLabelSx}>Счёт</Typography>
                <Typography sx={{ ...metricLabelSx, textAlign: 'right' }}>Пришло</Typography>
                <Typography sx={{ ...metricLabelSx, textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                    Потрачено
                </Typography>
                <Typography sx={{ ...metricLabelSx, textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                    Сейчас
                </Typography>
            </Box>
            {rows.slice(0, 8).map((item, index) => (
                <Box
                    key={`${item.accountName}-${index}`}
                    sx={{
                        px: 1.5,
                        py: 1.1,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1.3fr 1fr', md: '1.4fr 1fr 1fr 1fr' },
                        gap: 1,
                        borderBottom: index < Math.min(rows.length, 8) - 1 ? '1px solid' : 'none',
                        borderColor: 'divider'
                    }}
                >
                    <Typography variant="body2">{item.accountName}</Typography>
                    <Typography variant="body2" sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMoney(item.income)}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            display: { xs: 'none', md: 'block' },
                            color: 'text.secondary'
                        }}
                    >
                        {formatMoney(item.expenses)}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            display: { xs: 'none', md: 'block' },
                            fontWeight: 600
                        }}
                    >
                        {formatMoney(item.current)}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

const useDashboardAnalytics = (period) => {
    const [data, setData] = useState({
        productSales: [],
        financialSummary: { revenue: 0, expenses: 0, profit: 0, ordersCount: 0 },
        accountFinancials: { totalIncome: 0, totalExpenses: 0, totalCurrent: 0, byAccount: [] },
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
                    headers: { Authorization: `Bearer ${token}` }
                });
                const body = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(body.message || 'Не удалось получить аналитику');
                if (isMounted) {
                    setData({
                        productSales: Array.isArray(body?.data?.productSales)
                            ? body.data.productSales
                            : Array.isArray(body?.data?.topProducts)
                            ? body.data.topProducts
                            : [],
                        financialSummary: body?.data?.financialSummary || {
                            revenue: 0,
                            expenses: 0,
                            profit: 0,
                            ordersCount: 0
                        },
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
                if (isMounted) setLoading(false);
            }
        };
        loadAnalytics();
        return () => {
            isMounted = false;
        };
    }, [period, notify]);

    return { data, loading };
};

const PeriodSelector = ({ value, onChange }) => (
    <ToggleButtonGroup
        size="small"
        exclusive
        value={value}
        onChange={(_, next) => next && onChange(next)}
        sx={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 0.4,
            '& .MuiToggleButton-root': {
                border: 0,
                borderRadius: '6px !important',
                px: 1.5,
                py: 0.5,
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'none',
                '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { backgroundColor: 'primary.dark' }
                }
            }
        }}
    >
        {Object.entries(periodLabels).map(([key, label]) => (
            <ToggleButton key={key} value={key}>
                {label}
            </ToggleButton>
        ))}
    </ToggleButtonGroup>
);

const AdminDashboard = () => {
    const [period, setPeriod] = useState('month');
    const createPath = useCreatePath();
    const { data: analytics, loading } = useDashboardAnalytics(period);
    const isCompact = useMediaQuery((t) => t.breakpoints.down('sm'));

    const orderChartData = useMemo(() => {
        const points = analytics.orderSeries?.[period] || [];
        return {
            labels: points.map((p) => p.label),
            lines: [
                {
                    key: 'orders',
                    label: 'Оплаченные связи',
                    color: chartColors.orders,
                    values: points.map((p) => Number(p.orders || 0))
                }
            ]
        };
    }, [analytics.orderSeries, period]);

    const financeChartData = useMemo(() => {
        const points = analytics.financeSeries?.[period] || [];
        return {
            labels: points.map((p) => p.label),
            lines: [
                {
                    key: 'turnover',
                    label: 'Оборот',
                    color: chartColors.turnover,
                    values: points.map((p) => Number(p.turnover || 0))
                },
                {
                    key: 'expenses',
                    label: 'Расход',
                    color: chartColors.expenses,
                    values: points.map((p) => Number(p.expenses || 0))
                },
                {
                    key: 'profit',
                    label: 'Прибыль',
                    color: chartColors.profit,
                    values: points.map((p) => Number(p.profit || 0))
                }
            ]
        };
    }, [analytics.financeSeries, period]);

    const fs = analytics.financialSummary || {};

    return (
        <PageShell
            title="Дашборд"
            description={
                loading
                    ? 'Загрузка аналитики…'
                    : `${periodLabels[period]} · ${Number(fs.ordersCount || 0)} оплаченных связей`
            }
            actions={
                <Stack direction="row" spacing={1} alignItems="center">
                    {loading && <CircularProgress size={16} thickness={5} />}
                    <PeriodSelector value={period} onChange={setPeriod} />
                </Stack>
            }
        >
            <Box sx={summaryGridSx}>
                <KpiCard label="Доход" value={formatMoney(fs.revenue)} hint={periodLabels[period]} />
                <KpiCard
                    label="Расход"
                    value={formatMoney(fs.expenses)}
                    hint={periodLabels[period]}
                    accent={RED}
                />
                <KpiCard
                    label="Сейчас"
                    value={formatMoney(fs.profit)}
                    hint="Остаток на счетах"
                    accent={PRIMARY}
                />
                <KpiCard label="Связей" value={String(Number(fs.ordersCount || 0))} hint="Оплачено" />
            </Box>

            <PageSection title="Финансы" description="Оборот, расход и прибыль по выбранному периоду">
                <InteractiveLineChart
                    title="finance"
                    labels={financeChartData.labels}
                    series={financeChartData.lines}
                    formatValue={(value) => formatMoney(value)}
                />
            </PageSection>

            <PageSection title="Связи клиент-ссылка" description="Динамика оплаченных связей">
                <InteractiveLineChart
                    title="orders"
                    labels={orderChartData.labels}
                    series={orderChartData.lines}
                    formatValue={(value) => String(Math.round(Number(value || 0)))}
                />
            </PageSection>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                    gap: { xs: 2, md: 2.5 }
                }}
            >
                <PageSection
                    title="Продажи товаров"
                    actions={<BarChartOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />}
                >
                    <ProductSalesList rows={analytics.productSales || []} />
                </PageSection>
                <PageSection title="Счета" description="Топ-8 по обороту">
                    <AccountsTable rows={Array.isArray(analytics.accountFinancials?.byAccount) ? analytics.accountFinancials.byAccount : []} />
                </PageSection>
            </Box>

            <PageSection title="Быстрые действия">
                <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{
                        overflowX: isCompact ? 'auto' : 'visible',
                        pb: isCompact ? 0.5 : 0
                    }}
                >
                    <Button
                        component={RouterLink}
                        to={createPath({ resource: 'orders', type: 'list' })}
                        variant="contained"
                        size="small"
                    >
                        Заказы
                    </Button>
                    <Button
                        component={RouterLink}
                        to={createPath({ resource: 'products', type: 'list' })}
                        variant="outlined"
                        size="small"
                    >
                        Товары
                    </Button>
                    <Button
                        component={RouterLink}
                        to={createPath({ resource: 'accounting', type: 'list' })}
                        variant="outlined"
                        size="small"
                    >
                        Бухгалтерия
                    </Button>
                    <Button
                        component={RouterLink}
                        to={createPath({ resource: 'add-expense', type: 'list' })}
                        variant="outlined"
                        size="small"
                    >
                        Добавить расход
                    </Button>
                    <Button
                        component={RouterLink}
                        to={createPath({ resource: 'incoming', type: 'list' })}
                        variant="outlined"
                        size="small"
                    >
                        Приход
                    </Button>
                    <Button
                        component={RouterLink}
                        to={createPath({ resource: 'qr-codes', type: 'list' })}
                        variant="outlined"
                        size="small"
                    >
                        QR-коды
                    </Button>
                </Stack>
            </PageSection>
        </PageShell>
    );
};

export default AdminDashboard;
