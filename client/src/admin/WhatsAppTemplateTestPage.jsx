import { useState } from 'react';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const MESSAGE_TYPE_OPTIONS = [
    { value: 'text', label: 'Текстовое сообщение' },
    { value: 'agree_template', label: 'Шаблон agree' },
    { value: 'auth_template', label: 'Шаблон auth' },
    { value: 'order_tracking_template', label: 'Шаблон order_tracking' }
];

const WhatsAppTemplateTestPage = () => {
    const notify = useNotify();
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [form, setForm] = useState({
        phoneNumber: '',
        messageType: MESSAGE_TYPE_OPTIONS[0].value
    });

    const submit = async (event) => {
        event.preventDefault();
        if (sending) {
            return;
        }

        const phoneNumber = String(form.phoneNumber || '').trim();
        const messageType = String(form.messageType || '').trim();

        if (!phoneNumber) {
            notify('Укажите номер телефона', { type: 'warning' });
            return;
        }

        if (!messageType) {
            notify('Выберите тип сообщения', { type: 'warning' });
            return;
        }

        setSending(true);
        setResult(null);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl('/admin/whatsapp/test-template'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    phoneNumber,
                    messageType
                })
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || body.error || 'Не удалось отправить шаблон');
            }

            setResult(body.data || null);
            notify('Сообщение отправлено', { type: 'success' });
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setSending(false);
        }
    };

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
                <Typography variant="h5">Тест сообщений WhatsApp</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Выберите тип из доступных в системе, укажите номер и отправьте тест.
                </Typography>
            </Box>

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Box component="form" onSubmit={submit}>
                    <Stack spacing={1.5}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <TextField
                                label="Номер получателя"
                                placeholder="77073670497"
                                value={form.phoneNumber}
                                onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                                fullWidth
                                required
                            />
                            <TextField
                                label="Тип сообщения"
                                value={form.messageType}
                                onChange={(event) => setForm((prev) => ({ ...prev, messageType: event.target.value }))}
                                select
                                sx={{ minWidth: 280 }}
                                required
                            >
                                {MESSAGE_TYPE_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Stack>

                        <Button type="submit" variant="contained" disabled={sending} sx={{ alignSelf: 'flex-start' }}>
                            Отправить
                        </Button>
                    </Stack>
                </Box>
            </Paper>

            {result ? (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                    Отправлено на {result.phoneNumber}. Тип: <strong>{result.messageType}</strong>
                    <Box component="pre" sx={{ mt: 1, mb: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                        {JSON.stringify(result.providerResponse || {}, null, 2)}
                    </Box>
                </Alert>
            ) : null}
        </Stack>
    );
};

export default WhatsAppTemplateTestPage;
