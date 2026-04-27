import { useState } from 'react';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const MESSAGE_TYPE_OPTIONS = [
    { value: 'order_created_details_site_text', label: 'Заказ создан (детали, сайт)' },
    { value: 'order_created_details_admin_text', label: 'Заказ создан (детали, админка)' },
    { value: 'order_created_payment_instruction_text', label: 'Заказ создан (инструкция оплаты)' },
    { value: 'order_status_changed_text', label: 'Изменение статуса заказа' },
    { value: 'admin_expense_added_text', label: 'Расход добавлен (webhook)' },
    { value: 'order_draft_unknown_aliases_text', label: 'Не найдены псевдонимы (webhook)' },
    { value: 'order_draft_empty_items_text', label: 'Пустой список товаров (webhook)' },
    { value: 'order_draft_total_to_pay_text', label: 'К оплате (webhook)' },
    { value: 'payment_link_with_footer_text', label: 'Ссылка на оплату + футер (webhook)' },
    { value: 'order_draft_auto_create_failed_text', label: 'Ошибка автосоздания заказа (webhook)' },
    { value: 'auth_template', label: 'Код подтверждения' },
    { value: 'order_tracking_template', label: 'Трек-номер заказа' }
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
            <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.015em' }}>
                    Тест сообщений WhatsApp
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Выберите тип из доступных в системе, укажите номер и отправьте тест.
                </Typography>
            </Box>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
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
