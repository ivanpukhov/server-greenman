import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
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

const periodOptions = [
    { id: 'today', label: 'Сегодня' },
    { id: 'yesterday', label: 'Вчера' },
    { id: 'daybeforeyesterday', label: 'Позавчера' },
    { id: 'week', label: 'Неделя' },
    { id: 'month', label: 'Месяц' },
    { id: 'all', label: 'Все' }
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
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU');
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
    document.body.appendChild(frame);

    const cleanup = () => {
        window.setTimeout(() => {
            if (frame.parentNode) {
                frame.parentNode.removeChild(frame);
            }
        }, 300);
    };

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
    paid: 'success',
    awaiting_payment: 'warning',
    awaiting_alias_fix: 'error',
    error: 'error',
    processing: 'default'
};

const buildInitialCorrections = (unknownAliases = []) =>
    unknownAliases.length > 0
        ? unknownAliases.map((alias, index) => ({
            id: `unknown-${index}-${alias}`,
            original: String(alias || '').trim(),
            replacement: ''
        }))
        : [
            {
                id: 'extra-0',
                original: '',
                replacement: ''
            }
        ];

const OrderDraftRequestsPage = () => {
    const notify = useNotify();
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('md'));
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [period, setPeriod] = useState('today');
    const [retryRow, setRetryRow] = useState(null);
    const [sourceText, setSourceText] = useState('');
    const [corrections, setCorrections] = useState([]);
    const [aliasOptions, setAliasOptions] = useState([]);
    const [retryingId, setRetryingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const loadAliases = useCallback(async () => {
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl('/admin/inventory/qr-codes'), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || 'Не удалось загрузить псевдонимы');
            }

            const options = [...new Set((Array.isArray(body.data) ? body.data : [])
                .map((item) => String(item.alias || '').trim())
                .filter(Boolean))]
                .sort((left, right) => left.localeCompare(right, 'ru-RU'));
            setAliasOptions(options);
        } catch (error) {
            notify(error.message, { type: 'error' });
        }
    }, [notify]);

    const loadData = useCallback(
        async (searchQuery = '', nextPeriod = 'all') => {
            setLoading(true);
            try {
                const token = adminAuthStorage.getToken();
                const params = new URLSearchParams({
                    sort: JSON.stringify(['createdAt', 'DESC']),
                    range: JSON.stringify([0, 999]),
                    filter: JSON.stringify({
                        q: searchQuery || '',
                        period: nextPeriod
                    })
                });

                const response = await fetch(apiUrl(`/admin/order-draft-requests?${params.toString()}`), {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const body = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(body.message || 'Не удалось загрузить сообщения "Ваш заказ"');
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
        loadData('', 'today');
        loadAliases();
    }, [loadAliases, loadData]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            loadData(query, period);
        }, 30000);

        return () => window.clearInterval(timer);
    }, [loadData, query, period]);

    const needsAttentionCount = useMemo(
        () =>
            rows.filter((row) =>
                ['awaiting_alias_fix', 'error'].includes(String(row.paymentStatusCode || '').trim())
            ).length,
        [rows]
    );

    const openRetryDialog = (row) => {
        setRetryRow(row);
        setSourceText(String(row.sourceText || '').trim());
        setCorrections(buildInitialCorrections(row.unknownAliases || []));
    };

    const closeRetryDialog = () => {
        if (retryingId) {
            return;
        }
        setRetryRow(null);
        setSourceText('');
        setCorrections([]);
    };

    const updateCorrection = (id, field, value) => {
        setCorrections((prev) =>
            prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
        );
    };

    const addCorrection = () => {
        setCorrections((prev) => [
            ...prev,
            {
                id: `extra-${Date.now()}-${prev.length}`,
                original: '',
                replacement: ''
            }
        ]);
    };

    const removeCorrection = (id) => {
        setCorrections((prev) => prev.filter((item) => item.id !== id));
    };

    const submitRetry = async () => {
        if (!retryRow) {
            return;
        }

        const payloadCorrections = corrections
            .map((item) => ({
                original: String(item.original || '').trim(),
                replacement: String(item.replacement || '').trim()
            }))
            .filter((item) => item.original || item.replacement);

        setRetryingId(retryRow.id);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl(`/admin/order-draft-requests/${retryRow.id}/retry`), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    corrections: payloadCorrections,
                    sourceText: sourceText.trim()
                })
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || body.error || 'Не удалось повторно обработать сообщение');
            }

            notify('Сообщение "Ваш заказ" обработано повторно', { type: 'success' });
            closeRetryDialog();
            await loadData(query, period);
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setRetryingId(null);
        }
    };

    const deleteRow = async (row) => {
        if (!row?.id || deletingId) {
            return;
        }

        const confirmed = window.confirm('Удалить эту запись "Ваш заказ"?');
        if (!confirmed) {
            return;
        }

        setDeletingId(row.id);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl(`/admin/order-draft-requests/${row.id}`), {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || 'Не удалось удалить запись');
            }

            notify('Запись удалена', { type: 'success' });
            await loadData(query, period);
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setDeletingId(null);
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
                variant={row.paymentStatusCode === 'awaiting_alias_fix' ? 'contained' : 'outlined'}
                color={row.paymentStatusCode === 'awaiting_alias_fix' ? 'warning' : 'inherit'}
                startIcon={<ReplayOutlinedIcon />}
                onClick={() => openRetryDialog(row)}
            >
                Повторить
            </Button>
            <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<DeleteOutlineOutlinedIcon />}
                disabled={deletingId === row.id}
                onClick={() => deleteRow(row)}
            >
                Удалить
            </Button>
        </Stack>
    );

    return (
        <Stack spacing={2.2}>
            <Paper sx={{ p: 2.2, borderRadius: 2.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'center' }}>
                    <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <AssignmentOutlinedIcon color="primary" />
                            <Typography variant="h6">Ваш заказ</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                            Все сообщения, которые начинаются с фразы `Ваш заказ`, с привязкой к оплате, заказу и треку.
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.2 }}>
                            <Chip
                                icon={<WarningAmberOutlinedIcon />}
                                label={`Нужно исправить: ${needsAttentionCount}`}
                                color={needsAttentionCount > 0 ? 'warning' : 'default'}
                                variant={needsAttentionCount > 0 ? 'filled' : 'outlined'}
                            />
                            <Chip label={`Всего записей: ${rows.length}`} variant="outlined" />
                        </Stack>
                    </Box>
                    <Stack
                        component="form"
                        direction={{ xs: 'column', md: 'row' }}
                        gap={1}
                        onSubmit={(event) => {
                            event.preventDefault();
                            loadData(query, period);
                        }}
                    >
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
                            variant="outlined"
                            startIcon={<RefreshOutlinedIcon />}
                            onClick={() => loadData(query, period)}
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
                                loadData(query, option.id);
                            }}
                        >
                            {option.label}
                        </Button>
                    ))}
                </Stack>
            </Paper>

            {rows.length === 0 && !loading ? (
                <Alert severity="info">Сообщения "Ваш заказ" пока не найдены.</Alert>
            ) : null}

            <Paper sx={{ borderRadius: 2.5, overflow: 'hidden', p: isSmall ? 1.2 : 0 }}>
                {isSmall ? (
                    <Stack spacing={1.2}>
                        {rows.map((row) => (
                            <Card key={row.id} variant="outlined" sx={{ borderRadius: 2.5 }}>
                                <CardContent>
                                    <Stack spacing={1}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle2">{row.customerPhone || '—'}</Typography>
                                            <Chip
                                                label={row.paymentStatusLabel}
                                                size="small"
                                                color={statusColorMap[row.paymentStatusCode] || 'default'}
                                                variant={row.paymentStatusCode === 'processing' ? 'outlined' : 'filled'}
                                            />
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">
                                            Получено: {formatDateTime(row.createdAt)}
                                        </Typography>
                                        <Typography variant="body2">Заказ: {row.orderId ? `#${row.orderId}` : '—'}</Typography>
                                        <Typography variant="body2">Трек: {row.trackingNumber || '—'}</Typography>
                                        {row.lastError ? (
                                            <Alert severity="warning">{row.lastError}</Alert>
                                        ) : null}
                                        {row.paymentStatusCode === 'awaiting_alias_fix' ? (
                                            <Alert severity="warning">
                                                Не найдены псевдонимы: {(row.unknownAliases || []).join(', ') || '—'}
                                            </Alert>
                                        ) : null}
                                        {renderRowActions(row)}
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 1180 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Телефон</TableCell>
                                    <TableCell>Создано</TableCell>
                                    <TableCell>ID заказа</TableCell>
                                    <TableCell>Статус оплаты</TableCell>
                                    <TableCell>Трек-номер</TableCell>
                                    <TableCell>Псевдонимы</TableCell>
                                    <TableCell>Ошибка</TableCell>
                                    <TableCell align="right">Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>{row.customerPhone || '—'}</TableCell>
                                        <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                                        <TableCell>{row.orderId ? `#${row.orderId}` : '—'}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={row.paymentStatusLabel}
                                                size="small"
                                                color={statusColorMap[row.paymentStatusCode] || 'default'}
                                                variant={row.paymentStatusCode === 'processing' ? 'outlined' : 'filled'}
                                            />
                                        </TableCell>
                                        <TableCell>{row.trackingNumber || '—'}</TableCell>
                                        <TableCell sx={{ maxWidth: 360 }}>
                                            {row.paymentStatusCode === 'awaiting_alias_fix' ? (
                                                <Typography variant="body2" color="warning.main">
                                                    {(row.unknownAliases || []).join(', ') || '—'}
                                                </Typography>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    {(row.parsedAliases || []).map((item) => item.alias).filter(Boolean).join(', ') || '—'}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 360 }}>
                                            <Typography variant="body2" color={row.lastError ? 'warning.main' : 'text.secondary'}>
                                                {row.lastError || '—'}
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

            <Dialog open={Boolean(retryRow)} onClose={closeRetryDialog} fullWidth maxWidth="md" fullScreen={isSmall}>
                <DialogTitle>Исправить псевдонимы</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={1.5}>
                        <Typography variant="body2" color="text.secondary">
                            Исправьте ненайденые псевдонимы или поправьте весь текст сообщения, затем отправьте его на повторную обработку.
                        </Typography>
                        {retryRow?.lastError ? (
                            <Alert severity="warning">{retryRow.lastError}</Alert>
                        ) : null}
                        {(retryRow?.unknownAliases || []).length > 0 ? (
                            <Alert severity="info">
                                Ненайденые псевдонимы: {(retryRow.unknownAliases || []).join(', ')}
                            </Alert>
                        ) : null}
                        <TextField
                            label="Текст сообщения"
                            fullWidth
                            multiline
                            minRows={8}
                            value={sourceText}
                            onChange={(event) => setSourceText(event.target.value)}
                        />
                        {(corrections || []).map((item) => (
                            <Stack
                                key={item.id}
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={1}
                                alignItems={{ md: 'stretch' }}
                            >
                                <TextField
                                    label="Исходный псевдоним"
                                    value={item.original}
                                    onChange={(event) => updateCorrection(item.id, 'original', event.target.value)}
                                    fullWidth
                                    sx={{ flex: 1 }}
                                />
                                <Autocomplete
                                    freeSolo
                                    options={aliasOptions}
                                    value={item.replacement}
                                    onInputChange={(_event, value) => updateCorrection(item.id, 'replacement', value)}
                                    onChange={(_event, value) => updateCorrection(item.id, 'replacement', value || '')}
                                    sx={{ flex: 1 }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Новый псевдоним"
                                            fullWidth
                                        />
                                    )}
                                />
                                <IconButton
                                    onClick={() => removeCorrection(item.id)}
                                    aria-label="Удалить строку"
                                    sx={{ alignSelf: { xs: 'flex-end', md: 'center' } }}
                                >
                                    <CloseOutlinedIcon />
                                </IconButton>
                            </Stack>
                        ))}
                        <Box>
                            <Button startIcon={<AddOutlinedIcon />} onClick={addCorrection}>
                                Добавить псевдоним
                            </Button>
                        </Box>
                        {retryRow?.aiJsonText ? (
                            <Alert severity="info">Последний JSON ИИ: {retryRow.aiJsonText}</Alert>
                        ) : null}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeRetryDialog} disabled={Boolean(retryingId)}>
                        Отмена
                    </Button>
                    <Button onClick={submitRetry} variant="contained" disabled={Boolean(retryingId) || !sourceText.trim()}>
                        Отправить
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

export default OrderDraftRequestsPage;
