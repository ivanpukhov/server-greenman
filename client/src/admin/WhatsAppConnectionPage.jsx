import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const STATUS_LABELS = {
    idle: 'Не запущен',
    connecting: 'Подключение',
    qr: 'Ожидает сканирования QR',
    open: 'Подключен',
    closed: 'Отключен'
};

const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('ru-RU');
};

const eventColorByType = (type = '') => {
    if (type.includes('error')) return 'error';
    if (type.includes('close')) return 'warning';
    if (type.includes('open')) return 'success';
    return 'default';
};

const WhatsAppConnectionPage = () => {
    const notify = useNotify();
    const [status, setStatus] = useState(null);
    const [loadingQr, setLoadingQr] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const [events, setEvents] = useState([]);
    const [errorText, setErrorText] = useState('');
    const maxEventIdRef = useRef(0);

    const authorizedFetch = useCallback(async (url, options = {}) => {
        const token = adminAuthStorage.getToken();
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || body.error || 'Ошибка запроса');
        }
        return body;
    }, []);

    const loadStatus = useCallback(async () => {
        const body = await authorizedFetch(apiUrl('/admin/whatsapp/baileys/status'));
        setStatus(body.data || null);
    }, [authorizedFetch]);

    const loadEvents = useCallback(async () => {
        const body = await authorizedFetch(
            apiUrl(`/admin/whatsapp/baileys/events?sinceId=${maxEventIdRef.current}&limit=200`)
        );
        const nextEvents = Array.isArray(body.data) ? body.data : [];
        if (nextEvents.length === 0) {
            return;
        }

        maxEventIdRef.current = Math.max(
            maxEventIdRef.current,
            ...nextEvents.map((event) => Number(event?.id) || 0)
        );

        setEvents((prev) => {
            const merged = [...prev, ...nextEvents];
            if (merged.length <= 300) {
                return merged;
            }
            return merged.slice(merged.length - 300);
        });
    }, [authorizedFetch]);

    const handleRequestQr = async () => {
        if (loadingQr) return;
        setLoadingQr(true);
        setErrorText('');
        try {
            const body = await authorizedFetch(apiUrl('/admin/whatsapp/baileys/qr'), {
                method: 'POST'
            });
            setStatus(body.data || null);
            notify('QR обновлен', { type: 'success' });
        } catch (error) {
            setErrorText(error.message);
            notify(error.message, { type: 'error' });
        } finally {
            setLoadingQr(false);
        }
    };

    const handleRestart = async () => {
        if (restarting) return;
        setRestarting(true);
        setErrorText('');
        try {
            const body = await authorizedFetch(apiUrl('/admin/whatsapp/baileys/restart'), {
                method: 'POST'
            });
            setStatus(body.data || null);
            notify('Baileys перезапущен', { type: 'success' });
        } catch (error) {
            setErrorText(error.message);
            notify(error.message, { type: 'error' });
        } finally {
            setRestarting(false);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                await loadStatus();
                await loadEvents();
            } catch (error) {
                if (!cancelled) {
                    setErrorText(error.message);
                }
            }
        };

        init();
        const statusTimer = setInterval(() => {
            loadStatus().catch(() => null);
        }, 5000);
        const eventsTimer = setInterval(() => {
            loadEvents().catch(() => null);
        }, 2000);

        return () => {
            cancelled = true;
            clearInterval(statusTimer);
            clearInterval(eventsTimer);
        };
    }, [loadEvents, loadStatus]);

    const statusLabel = useMemo(() => {
        const key = String(status?.connection || 'idle');
        return STATUS_LABELS[key] || key;
    }, [status]);

    return (
        <Stack spacing={2.5}>
            <Box
                sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 3,
                    border: '1px solid rgba(16,40,29,0.08)',
                    background: 'linear-gradient(135deg, rgba(19,111,99,0.16) 0%, rgba(31,154,96,0.12) 100%)'
                }}
            >
                <Typography variant="h5">Подключение WhatsApp (Baileys)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Отправка сообщений остается через 360dialog. Здесь используется только прием уведомлений и авторизация через QR.
                </Typography>
            </Box>

            {errorText ? <Alert severity="error">{errorText}</Alert> : null}

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
                        <Typography variant="body1">Статус:</Typography>
                        <Chip
                            color={status?.connection === 'open' ? 'success' : status?.connection === 'qr' ? 'warning' : 'default'}
                            label={statusLabel}
                            size="small"
                        />
                        <Typography variant="caption" color="text.secondary">
                            Обновлено: {formatDateTime(status?.updatedAt)}
                        </Typography>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                        <Button
                            variant="contained"
                            onClick={handleRequestQr}
                            disabled={loadingQr}
                            startIcon={<QrCode2OutlinedIcon />}
                        >
                            Получить QR
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleRestart}
                            disabled={restarting}
                            startIcon={<AutorenewOutlinedIcon />}
                        >
                            Перезапустить
                        </Button>
                    </Stack>

                    {status?.qrImageDataUrl ? (
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Сканируйте QR в WhatsApp
                            </Typography>
                            <Box
                                component="img"
                                src={status.qrImageDataUrl}
                                alt="WhatsApp QR"
                                sx={{
                                    width: 280,
                                    maxWidth: '100%',
                                    borderRadius: 2,
                                    border: '1px solid rgba(16,40,29,0.14)',
                                    backgroundColor: '#fff',
                                    p: 1
                                }}
                            />
                        </Box>
                    ) : null}
                </Stack>
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Typography variant="h6" sx={{ mb: 1.2 }}>
                    Уведомления WhatsApp
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    В ленте отображаются входящие и исходящие сообщения, статусы доставок и presence-события.
                </Typography>
                <Stack spacing={1}>
                    {events.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            Событий пока нет
                        </Typography>
                    ) : (
                        [...events].reverse().map((event) => (
                            <Box
                                key={event.id}
                                sx={{
                                    p: 1.2,
                                    borderRadius: 1.5,
                                    border: '1px solid rgba(16,40,29,0.08)',
                                    backgroundColor: '#fff'
                                }}
                            >
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                                    <Chip size="small" color={eventColorByType(event.type)} label={event.type || 'event'} />
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDateTime(event.time)}
                                    </Typography>
                                    {event.direction ? (
                                        <Chip
                                            size="small"
                                            variant="outlined"
                                            label={event.direction === 'incoming' ? 'Входящее' : 'Исходящее'}
                                        />
                                    ) : null}
                                    {event.chatId ? (
                                        <Typography variant="caption" color="text.secondary">
                                            чат: {event.chatId}
                                        </Typography>
                                    ) : null}
                                </Stack>
                                {event.text ? (
                                    <Typography variant="body2" sx={{ mt: 0.8, whiteSpace: 'pre-wrap' }}>
                                        {event.text}
                                    </Typography>
                                ) : null}
                            </Box>
                        ))
                    )}
                </Stack>
            </Paper>
        </Stack>
    );
};

export default WhatsAppConnectionPage;
