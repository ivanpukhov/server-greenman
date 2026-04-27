import { useMemo, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const AddExpensePage = () => {
    const notify = useNotify();
    const [submitting, setSubmitting] = useState(false);
    const [lastExpense, setLastExpense] = useState(null);
    const [form, setForm] = useState({
        category: '',
        amount: '',
        description: ''
    });

    const currentAdminName = useMemo(() => {
        try {
            const rawUser = localStorage.getItem('admin_user');
            const user = rawUser ? JSON.parse(rawUser) : null;
            return user?.fullName || `+7${user?.phoneNumber || ''}`;
        } catch (_error) {
            return 'Текущий админ';
        }
    }, []);

    const onSubmitExpense = async (event) => {
        event.preventDefault();
        if (submitting) {
            return;
        }

        const amount = Number(form.amount);
        if (!form.category.trim()) {
            notify('Укажите категорию расхода', { type: 'warning' });
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            notify('Сумма расхода должна быть больше 0', { type: 'warning' });
            return;
        }

        setSubmitting(true);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl('/admin/expenses'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    category: form.category.trim(),
                    amount,
                    description: form.description.trim()
                })
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || 'Не удалось добавить расход');
            }

            setForm({
                category: '',
                amount: '',
                description: ''
            });
            setLastExpense(body.data || null);
            notify('Расход добавлен', { type: 'success' });
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Stack spacing={2.5}>
            <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.015em' }}>
                    Добавить расход
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Кто потратил: <strong>{currentAdminName}</strong> (автоматически)
                </Typography>
            </Box>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Box component="form" onSubmit={onSubmitExpense}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                        <TextField
                            label="Категория / на что"
                            value={form.category}
                            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Сумма"
                            type="number"
                            value={form.amount}
                            onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                            inputProps={{ min: 0, step: 1 }}
                            sx={{ minWidth: 180 }}
                            required
                        />
                    </Stack>
                    <TextField
                        label="Комментарий"
                        value={form.description}
                        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                        fullWidth
                        multiline
                        minRows={2}
                        sx={{ mt: 1.5 }}
                    />
                    <Button type="submit" variant="contained" sx={{ mt: 1.5 }} disabled={submitting}>
                        Добавить расход
                    </Button>
                </Box>
            </Paper>

            {lastExpense ? (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                    Расход сохранен: {lastExpense.category} на {lastExpense.amount} ₸
                </Alert>
            ) : null}
        </Stack>
    );
};

export default AddExpensePage;
