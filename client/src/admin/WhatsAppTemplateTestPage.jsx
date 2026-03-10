import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const DEFAULT_COMPONENTS = JSON.stringify(
    [
        {
            type: 'body',
            parameters: [
                {
                    type: 'text',
                    text: 'AP238974283KZ'
                },
                {
                    type: 'text',
                    text: 'https://track.greenman.kz/AP238974283KZ'
                }
            ]
        },
        {
            type: 'button',
            sub_type: 'URL',
            index: '0',
            parameters: [
                {
                    type: 'text',
                    text: 'AP238974283KZ'
                }
            ]
        }
    ],
    null,
    2
);

const WhatsAppTemplateTestPage = () => {
    const notify = useNotify();
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [form, setForm] = useState({
        phoneNumber: '',
        templateName: 'order_tracking',
        languageCode: 'ru',
        componentsText: DEFAULT_COMPONENTS
    });

    const submit = async (event) => {
        event.preventDefault();
        if (sending) {
            return;
        }

        const phoneNumber = String(form.phoneNumber || '').trim();
        const templateName = String(form.templateName || '').trim();
        const languageCode = String(form.languageCode || 'ru').trim() || 'ru';

        if (!phoneNumber) {
            notify('Укажите номер телефона', { type: 'warning' });
            return;
        }

        if (!templateName) {
            notify('Укажите имя шаблона', { type: 'warning' });
            return;
        }

        let components = [];
        const componentsText = String(form.componentsText || '').trim();
        if (componentsText) {
            try {
                const parsed = JSON.parse(componentsText);
                if (!Array.isArray(parsed)) {
                    notify('Components должен быть JSON-массивом', { type: 'warning' });
                    return;
                }
                components = parsed;
            } catch (_error) {
                notify('Components содержит невалидный JSON', { type: 'warning' });
                return;
            }
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
                    templateName,
                    languageCode,
                    components
                })
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || body.error || 'Не удалось отправить шаблон');
            }

            setResult(body.data || null);
            notify('Шаблон отправлен', { type: 'success' });
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
                <Typography variant="h5">Тест шаблонов WhatsApp</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Отправка любого template-сообщения через 360dialog на любой номер.
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
                                label="Имя шаблона"
                                value={form.templateName}
                                onChange={(event) => setForm((prev) => ({ ...prev, templateName: event.target.value }))}
                                sx={{ minWidth: 240 }}
                                required
                            />
                            <TextField
                                label="Язык"
                                value={form.languageCode}
                                onChange={(event) => setForm((prev) => ({ ...prev, languageCode: event.target.value }))}
                                sx={{ minWidth: 140 }}
                                required
                            />
                        </Stack>

                        <TextField
                            label="Components (JSON array)"
                            value={form.componentsText}
                            onChange={(event) => setForm((prev) => ({ ...prev, componentsText: event.target.value }))}
                            fullWidth
                            multiline
                            minRows={12}
                        />

                        <Button type="submit" variant="contained" disabled={sending} sx={{ alignSelf: 'flex-start' }}>
                            Отправить тестовый шаблон
                        </Button>
                    </Stack>
                </Box>
            </Paper>

            {result ? (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                    Отправлено на {result.phoneNumber} шаблоном <strong>{result.templateName}</strong>
                    <Box component="pre" sx={{ mt: 1, mb: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                        {JSON.stringify(result.providerResponse || {}, null, 2)}
                    </Box>
                </Alert>
            ) : null}
        </Stack>
    );
};

export default WhatsAppTemplateTestPage;
