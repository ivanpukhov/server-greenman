import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const senderLines = [
    'Пухова Наталья Васильевна',
    '87775464450',
    'T01P1C8, 150003',
    'Область Северо-Казахстанская',
    'город Петропавловск',
    'Улица Лазутина, 240'
];

const escapeHtml = (value) =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

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

const sanitizeTrackingNumber = (value) =>
    String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '');

const renderCode39SvgMarkup = (value) => {
    const normalized = sanitizeTrackingNumber(value);
    if (!normalized) {
        return '';
    }

    const patterns = {
        '0': 'nnnwwnwnn',
        '1': 'wnnwnnnnw',
        '2': 'nnwwnnnnw',
        '3': 'wnwwnnnnn',
        '4': 'nnnwwnnnw',
        '5': 'wnnwwnnnn',
        '6': 'nnwwwnnnn',
        '7': 'nnnwnnwnw',
        '8': 'wnnwnnwnn',
        '9': 'nnwwnnwnn',
        A: 'wnnnnwnnw',
        B: 'nnwnnwnnw',
        C: 'wnwnnwnnn',
        D: 'nnnnwwnnw',
        E: 'wnnnwwnnn',
        F: 'nnwnwwnnn',
        G: 'nnnnnwwnw',
        H: 'wnnnnwwnn',
        I: 'nnwnnwwnn',
        J: 'nnnnwwwnn',
        K: 'wnnnnnnww',
        L: 'nnwnnnnww',
        M: 'wnwnnnnwn',
        N: 'nnnnwnnww',
        O: 'wnnnwnnwn',
        P: 'nnwnwnnwn',
        Q: 'nnnnnnwww',
        R: 'wnnnnnwwn',
        S: 'nnwnnnwwn',
        T: 'nnnnwnwwn',
        U: 'wwnnnnnnw',
        V: 'nwwnnnnnw',
        W: 'wwwnnnnnn',
        X: 'nwnnwnnnw',
        Y: 'wwnnwnnnn',
        Z: 'nwwnwnnnn',
        '-': 'nwnnnnwnw',
        '*': 'nwnnwnwnn'
    };

    const encoded = `*${normalized}*`;
    const narrow = 3;
    const wide = 7;
    const height = 84;
    const gap = 3;
    let x = 12;
    const bars = [];

    for (const symbol of encoded) {
        const pattern = patterns[symbol];
        if (!pattern) {
            return '';
        }

        for (let index = 0; index < pattern.length; index += 1) {
            const isBar = index % 2 === 0;
            const width = pattern[index] === 'w' ? wide : narrow;
            if (isBar) {
                bars.push(`<rect x="${x}" y="8" width="${width}" height="${height}" fill="#111" />`);
            }
            x += width;
        }
        x += gap;
    }

    const width = x + 12;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 104" width="${width}" height="104" role="img" aria-label="Штрихкод">${bars.join('')}</svg>`;
};

const printTrackingLabel = (row) => {
    const trackingNumber = sanitizeTrackingNumber(row?.trackingNumber);
    if (!trackingNumber) {
        window.alert('Сначала дождитесь трек-номера');
        return;
    }

    const barcodeMarkup = renderCode39SvgMarkup(trackingNumber);
    if (!barcodeMarkup) {
        window.alert('Не удалось сформировать штрихкод');
        return;
    }

    const receiverLines = [
        String(row.customerName || '—').trim() || '—',
        row.customerPhone ? `+7${row.customerPhone}` : '—',
        `${String(row.addressIndex || '—').trim() || '—'}, ${String(row.city || '—').trim() || '—'}`,
        `${String(row.street || '—').trim() || '—'}, ${String(row.houseNumber || '—').trim() || '—'}`
    ];

    const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>Трек-номер ${escapeHtml(trackingNumber)}</title>
<style>
body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
.sheet { width: 100%; max-width: 920px; margin: 0 auto; }
.barcode { margin-bottom: 20px; }
.track-number { margin-top: 8px; font-weight: 700; letter-spacing: 1px; }
.blocks { display: flex; gap: 24px; align-items: stretch; }
.block { flex: 1; border: 1px solid #111; border-radius: 8px; padding: 14px; min-height: 180px; }
.title { font-size: 16px; font-weight: 700; margin: 0 0 12px; }
.line { font-size: 14px; line-height: 1.5; margin: 0; }
@media print { body { margin: 10mm; } }
</style>
</head>
<body>
    <div class="sheet">
        <div class="barcode">
            ${barcodeMarkup}
            <div class="track-number">${escapeHtml(trackingNumber)}</div>
        </div>
        <div class="blocks">
            <div class="block">
                <h2 class="title">Отправитель</h2>
                ${senderLines.map((line) => `<p class="line">${escapeHtml(line)}</p>`).join('')}
            </div>
            <div class="block">
                <h2 class="title">Получатель</h2>
                ${receiverLines.map((line) => `<p class="line">${escapeHtml(line)}</p>`).join('')}
            </div>
        </div>
    </div>
</body>
</html>`;

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';

    const cleanup = () => {
        window.setTimeout(() => {
            if (frame.parentNode) {
                frame.parentNode.removeChild(frame);
            }
        }, 300);
    };

    document.body.appendChild(frame);
    const frameWindow = frame.contentWindow;
    const frameDocument = frameWindow?.document;
    if (!frameWindow || !frameDocument) {
        cleanup();
        return;
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    const triggerPrint = () => {
        frameWindow.onafterprint = cleanup;
        frameWindow.focus();
        frameWindow.print();
        window.setTimeout(cleanup, 1500);
    };

    if (frameDocument.readyState === 'complete') {
        window.setTimeout(triggerPrint, 150);
        return;
    }

    frameWindow.onload = () => {
        window.setTimeout(triggerPrint, 150);
    };
};

const statusColorMap = {
    done: 'success',
    timeout: 'error',
    error: 'error',
    waiting_tracking: 'warning',
    processing: 'default'
};

const periodOptions = [
    { id: 'today', label: 'Сегодня' },
    { id: 'yesterday', label: 'Вчера' },
    { id: 'daybeforeyesterday', label: 'Позавчера' },
    { id: 'week', label: 'Неделя' },
    { id: 'month', label: 'Месяц' },
    { id: 'all', label: 'Все' }
];

const KazpostRequestsPage = () => {
    const notify = useNotify();
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('md'));
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);
    const [period, setPeriod] = useState('today');
    const [retryRow, setRetryRow] = useState(null);
    const [retryText, setRetryText] = useState('');
    const [retryingId, setRetryingId] = useState(null);

    const loadData = useCallback(
        async (searchQuery = '', onlyAttention = false, nextPeriod = 'all') => {
            setLoading(true);
            try {
                const token = adminAuthStorage.getToken();
                const params = new URLSearchParams({
                    sort: JSON.stringify(['createdAt', 'DESC']),
                    range: JSON.stringify([0, 999]),
                    filter: JSON.stringify({
                        q: searchQuery || '',
                        needsAttention: onlyAttention,
                        period: nextPeriod
                    })
                });

                const response = await fetch(apiUrl(`/admin/kazpost-requests?${params.toString()}`), {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const body = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(body.message || 'Не удалось загрузить запросы казпочты');
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
        loadData('', false, 'today');
    }, [loadData]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            loadData(query, needsAttentionOnly, period);
        }, 30000);

        return () => window.clearInterval(timer);
    }, [loadData, query, needsAttentionOnly, period]);

    const attentionCount = useMemo(() => rows.filter((row) => row.needsAttention).length, [rows]);

    const openRetryDialog = (row) => {
        setRetryRow(row);
        setRetryText(String(row.sourceText || '').trim());
    };

    const closeRetryDialog = () => {
        if (retryingId) {
            return;
        }
        setRetryRow(null);
        setRetryText('');
    };

    const submitRetry = async () => {
        if (!retryRow || !retryText.trim()) {
            return;
        }

        setRetryingId(retryRow.id);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl(`/admin/kazpost-requests/${retryRow.id}/retry`), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sourceText: retryText.trim()
                })
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || body.error || 'Не удалось повторить обработку');
            }

            notify('Запрос повторно отправлен в ИИ', { type: 'success' });
            closeRetryDialog();
            await loadData(query, needsAttentionOnly, period);
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setRetryingId(null);
        }
    };

    const renderRowActions = (row) => (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
            {row.orderId ? (
                <Button component="a" href={`#/orders/${row.orderId}/show`} size="small">
                    Заказ #{row.orderId}
                </Button>
            ) : null}
            <Button
                size="small"
                variant="outlined"
                startIcon={<PrintOutlinedIcon />}
                disabled={!row.trackingNumber}
                onClick={() => printTrackingLabel(row)}
            >
                Печать
            </Button>
            <Button
                size="small"
                variant={row.needsAttention ? 'contained' : 'outlined'}
                color={row.needsAttention ? 'warning' : 'inherit'}
                startIcon={<ReplayOutlinedIcon />}
                onClick={() => openRetryDialog(row)}
            >
                Повторить
            </Button>
        </Stack>
    );

    return (
        <Stack spacing={2.2}>
            <Box>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'flex-start' }} justifyContent="space-between">
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <LocalShippingOutlinedIcon color="primary" />
                            <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.015em' }}>
                                Казпочта: трек-страница
                            </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                            Здесь хранится связка: сообщение "казпочта", ответ ИИ, заказ и трек-номер.
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.2 }}>
                            <Chip
                                icon={<WarningAmberOutlinedIcon />}
                                label={`Требуют внимания: ${attentionCount}`}
                                color={attentionCount > 0 ? 'warning' : 'default'}
                                variant={attentionCount > 0 ? 'filled' : 'outlined'}
                            />
                            <Chip label={`Всего записей: ${rows.length}`} variant="outlined" />
                        </Stack>
                    </Box>
                    <Stack component="form" direction={{ xs: 'column', md: 'row' }} gap={1} onSubmit={(event) => {
                        event.preventDefault();
                        loadData(query, needsAttentionOnly, period);
                    }}>
                        <TextField
                            size="small"
                            placeholder="Поиск по номеру или тексту"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            sx={{ minWidth: { xs: '100%', md: 280 } }}
                        />
                        <Button type="submit" variant="contained" startIcon={<SearchOutlinedIcon />}>
                            Найти
                        </Button>
                        <Button
                            type="button"
                            variant={needsAttentionOnly ? 'contained' : 'outlined'}
                            color={needsAttentionOnly ? 'warning' : 'inherit'}
                            onClick={() => {
                                const nextValue = !needsAttentionOnly;
                                setNeedsAttentionOnly(nextValue);
                                loadData(query, nextValue, period);
                            }}
                        >
                            Только ошибки
                        </Button>
                        <Button
                            type="button"
                            variant="outlined"
                            startIcon={<RefreshOutlinedIcon />}
                            onClick={() => loadData(query, needsAttentionOnly, period)}
                        >
                            Обновить
                        </Button>
                    </Stack>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                    {periodOptions.map((option) => (
                        <Button
                            key={option.id}
                            size="small"
                            variant={period === option.id ? 'contained' : 'outlined'}
                            onClick={() => {
                                setPeriod(option.id);
                                loadData(query, needsAttentionOnly, option.id);
                            }}
                        >
                            {option.label}
                        </Button>
                    ))}
                </Stack>
            </Box>

            {rows.length === 0 && !loading ? (
                <Alert severity="info">Запросы казпочты пока не найдены.</Alert>
            ) : null}

            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden', p: isSmall ? 1.2 : 0 }}>
                {isSmall ? (
                    <Stack spacing={1.2}>
                        {rows.map((row) => (
                            <Card key={row.id} variant="outlined" sx={{ borderRadius: 2.5 }}>
                                <CardContent>
                                    <Stack spacing={1}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle2">{row.customerPhone || '—'}</Typography>
                                            <Chip
                                                label={row.stateLabel}
                                                size="small"
                                                color={statusColorMap[row.stateCode] || 'default'}
                                                variant={row.stateCode === 'processing' ? 'outlined' : 'filled'}
                                            />
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">
                                            Получено: {formatDateTime(row.createdAt)}
                                        </Typography>
                                        <Typography variant="body2">Заказ: {row.orderId ? `#${row.orderId}` : '—'}</Typography>
                                        <Typography variant="body2">Трек: {row.trackingNumber || '—'}</Typography>
                                        {row.errorText ? (
                                            <Alert severity={row.needsAttention ? 'error' : 'warning'}>{row.errorText}</Alert>
                                        ) : null}
                                        {renderRowActions(row)}
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 1120 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Телефон</TableCell>
                                    <TableCell>Создано</TableCell>
                                    <TableCell>Статус</TableCell>
                                    <TableCell>ID заказа</TableCell>
                                    <TableCell>Трек-номер</TableCell>
                                    <TableCell>Ошибка</TableCell>
                                    <TableCell align="right">Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>{row.customerPhone || '—'}</TableCell>
                                        <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={row.stateLabel}
                                                size="small"
                                                color={statusColorMap[row.stateCode] || 'default'}
                                                variant={row.stateCode === 'processing' ? 'outlined' : 'filled'}
                                            />
                                        </TableCell>
                                        <TableCell>{row.orderId ? `#${row.orderId}` : '—'}</TableCell>
                                        <TableCell>{row.trackingNumber || '—'}</TableCell>
                                        <TableCell sx={{ maxWidth: 360 }}>
                                            <Typography variant="body2" color={row.needsAttention ? 'error.main' : 'text.secondary'}>
                                                {row.errorText || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">{renderRowActions(row)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Paper>

            <Dialog open={Boolean(retryRow)} onClose={closeRetryDialog} fullWidth maxWidth="md">
                <DialogTitle>Повторная обработка запроса</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={1.5}>
                        <Typography variant="body2" color="text.secondary">
                            Здесь можно поправить исходное сообщение `казпочта`, затем снова отправить его в ИИ и обновить заказ.
                        </Typography>
                        <TextField
                            label="Текст сообщения"
                            fullWidth
                            multiline
                            minRows={8}
                            value={retryText}
                            onChange={(event) => setRetryText(event.target.value)}
                        />
                        {retryRow?.aiJsonText ? (
                            <Alert severity="info">Последний сохранённый JSON ИИ: {retryRow.aiJsonText}</Alert>
                        ) : null}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeRetryDialog} disabled={Boolean(retryingId)}>
                        Отмена
                    </Button>
                    <Button
                        onClick={submitRetry}
                        variant="contained"
                        disabled={Boolean(retryingId) || !retryText.trim()}
                    >
                        Отправить
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

export default KazpostRequestsPage;
