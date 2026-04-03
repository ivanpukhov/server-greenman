import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const STATUS_LABELS = {
    idle: 'Не запущен',
    authorized: 'Подключен',
    starting: 'Запускается',
    yellowCard: 'Желтая карточка',
    blocked: 'Заблокирован',
    sleepMode: 'Спящий режим',
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
    const notify = useNotify();
    const [status, setStatus] = useState(null);
    const [loadingQr, setLoadingQr] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [errorText, setErrorText] = useState('');

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

    const handleRequestQr = async () => {
        if (loadingQr) return;
        setLoadingQr(true);
        setErrorText('');
        try {
            const qrBody = await authorizedFetch(apiUrl('/admin/whatsapp/connection/qr'));
            setStatus((prev) => ({ ...(prev || {}), qr: qrBody.data || null }));
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
            await authorizedFetch(apiUrl('/admin/whatsapp/connection/reboot'), {
                method: 'POST'
            });
            await loadStatus();
            notify('Green API instance перезапущен', { type: 'success' });
        } catch (error) {
            setErrorText(error.message);
            notify(error.message, { type: 'error' });
        } finally {
            setRestarting(false);
        }
    };

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        setErrorText('');
        try {
            await authorizedFetch(apiUrl('/admin/whatsapp/connection/logout'), {
                method: 'POST'
            });
            await loadStatus();
            notify('WhatsApp разлогинен', { type: 'success' });
        } catch (error) {
            setErrorText(error.message);
            notify(error.message, { type: 'error' });
        } finally {
            setLoggingOut(false);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                await loadStatus();
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

        return () => {
            cancelled = true;
            clearInterval(statusTimer);
        };
    }, [loadStatus]);

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
                <Typography variant="h5">Подключение WhatsApp (Green API)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Входящие webhook и вся отправка теперь идут через Green API. Здесь можно проверить состояние instance и получить QR.
                </Typography>
            </Box>

            {errorText ? <Alert severity="error">{errorText}</Alert> : null}

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
                        <Typography variant="body1">Статус:</Typography>
                        <Chip
                            color={status?.connection === 'authorized' ? 'success' : status?.qr ? 'warning' : 'default'}
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
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            startIcon={<LogoutOutlinedIcon />}
                        >
                            Разлогинить
                        </Button>
                    </Stack>

                    {status?.qr?.message ? (
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Сканируйте QR в WhatsApp
                            </Typography>
                            <Box
                                component="img"
                                src={status.qr.message}
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

                    {!status?.qr?.message && status?.connection !== 'authorized' ? (
                        <Alert severity="warning">
                            Instance пока не авторизован. Если QR не появился автоматически, нажмите «Получить QR» или «Перезапустить».
                        </Alert>
                    ) : null}
                    {status?.settings ? (
                        <Alert severity="info">
                            webhookUrl: {status.settings.webhookUrl || 'не задан'}
                        </Alert>
                    ) : null}
                </Stack>
            </Paper>
        </Stack>
    );
};

export default WhatsAppConnectionPage;
