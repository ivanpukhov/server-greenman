import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const STATUS_LABELS = {
    configured: 'Настроен',
    missing_webhook: 'Webhook не задан',
    notAuthorized: 'Не авторизован',
    unknown: 'Неизвестно'
};

const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('ru-RU');
};

const WhatsAppConnectionPage = () => {
    const [status, setStatus] = useState(null);
    const [errorText, setErrorText] = useState('');
    const [events, setEvents] = useState([]);

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
        const body = await authorizedFetch(apiUrl('/admin/whatsapp/connection/status'));
        setStatus(body.data || null);
    }, [authorizedFetch]);

    const loadEvents = useCallback(async () => {
        const body = await authorizedFetch(apiUrl('/admin/whatsapp/connection/events?limit=15'));
        setEvents(Array.isArray(body.data) ? body.data : []);
    }, [authorizedFetch]);

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
        }, 5000);

        return () => {
            cancelled = true;
            clearInterval(statusTimer);
            clearInterval(eventsTimer);
        };
    }, [loadEvents, loadStatus]);

    const statusLabel = useMemo(() => {
        const key = String(status?.connection || 'unknown');
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
                <Typography variant="h5">Подключение WhatsApp (360dialog)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Здесь показан статус Cloud API, текущий webhook для номера и последние события, которые пришли на backend.
                </Typography>
            </Box>

            {errorText ? <Alert severity="error">{errorText}</Alert> : null}

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
                        <Typography variant="body1">Статус:</Typography>
                        <Chip
                            color={status?.connection === 'configured' ? 'success' : 'warning'}
                            label={statusLabel}
                            size="small"
                        />
                        <Typography variant="caption" color="text.secondary">
                            Обновлено: {formatDateTime(status?.updatedAt)}
                        </Typography>
                    </Stack>

                    {status?.connection !== 'configured' ? (
                        <Alert severity="warning">
                            Для 360dialog нужен публичный URL backend webhook. После его установки у номера статус сменится на «Настроен».
                        </Alert>
                    ) : null}
                    {status?.settings ? (
                        <Alert severity="info">
                            provider: {status?.provider || '360dialog Cloud API'}
                            <br />
                            webhookUrl: {status.settings.url || 'не задан'}
                        </Alert>
                    ) : null}
                </Stack>
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Typography variant="h6" sx={{ mb: 1.2 }}>
                    Последние 15 сообщений из webhook
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Лента обновляется автоматически и показывает последние события, пришедшие на backend webhook.
                </Typography>
                <Stack spacing={1}>
                    {events.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            Сообщений пока нет
                        </Typography>
                    ) : (
                        events.map((event) => (
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
                                    <Chip size="small" label={event.type || 'event'} />
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDateTime(event.time)}
                                    </Typography>
                                    {event.chatId ? (
                                        <Typography variant="caption" color="text.secondary">
                                            чат: {event.chatId}
                                        </Typography>
                                    ) : null}
                                </Stack>
                                <Typography variant="body2" sx={{ mt: 0.8, whiteSpace: 'pre-wrap' }}>
                                    {event.text || 'Без текста'}
                                </Typography>
                            </Box>
                        ))
                    )}
                </Stack>
            </Paper>
        </Stack>
    );
};

export default WhatsAppConnectionPage;
