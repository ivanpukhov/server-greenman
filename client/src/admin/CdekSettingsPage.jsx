import { useCallback, useEffect, useState } from 'react';
import {
    Alert, Box, Button, CircularProgress, Divider, FormControl,
    FormHelperText, InputAdornment, InputLabel, MenuItem, OutlinedInput,
    Paper, Select, Stack, TextField, Typography
} from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const BASE_URL_OPTIONS = [
    { label: 'Продакшн  (api.cdek.ru)', value: 'https://api.cdek.ru/v2' },
    { label: 'Тест  (api.edu.cdek.ru)', value: 'https://api.edu.cdek.ru/v2' }
];

const PLACEHOLDER = '••••••••';

const DEFAULT = {
    CDEK_BASE_URL: '',
    CDEK_CLIENT_ID: '',
    CDEK_CLIENT_SECRET: '',
    CDEK_SENDER_CITY_CODE: '',
    CDEK_SENDER_ADDRESS: '',
    CDEK_SENDER_NAME: '',
    CDEK_SENDER_PHONE: '',
    CDEK_SENDER_EMAIL: '',
    CDEK_SENDER_COMPANY: '',
    CDEK_TARIFF_CODE: '482'
};

const CdekSettingsPage = () => {
    const [form, setForm] = useState(DEFAULT);
    const [secretEditing, setSecretEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const authFetch = useCallback(async (url, options = {}) => {
        const token = adminAuthStorage.getToken();
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || body.error || 'Ошибка');
        return body;
    }, []);

    useEffect(() => {
        authFetch(apiUrl('/admin/settings/cdek'))
            .then((body) => setForm({ ...DEFAULT, ...body.data }))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [authFetch]);

    const handleChange = (key) => (e) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
        setSuccess(false);
    };

    const handleSecretFocus = () => {
        if (form.CDEK_CLIENT_SECRET === PLACEHOLDER) {
            setForm((prev) => ({ ...prev, CDEK_CLIENT_SECRET: '' }));
            setSecretEditing(true);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess(false);
        setError('');
        try {
            await authFetch(apiUrl('/admin/settings/cdek'), {
                method: 'PUT',
                body: JSON.stringify(form)
            });
            setSuccess(true);
            // Re-fetch to get masked secret back
            const body = await authFetch(apiUrl('/admin/settings/cdek'));
            setForm({ ...DEFAULT, ...body.data });
            setSecretEditing(false);
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: 3, maxWidth: 700 }}>
            <Stack direction="row" alignItems="center" gap={1} mb={3}>
                <SettingsOutlinedIcon color="action" />
                <Typography variant="h5" fontWeight={700}>Настройки СДЭК</Typography>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>Настройки сохранены</Alert>}

            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>API и авторизация</Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Среда СДЭК</InputLabel>
                    <Select
                        value={form.CDEK_BASE_URL}
                        label="Среда СДЭК"
                        onChange={handleChange('CDEK_BASE_URL')}
                    >
                        <MenuItem value=""><em>Выберите среду...</em></MenuItem>
                        {BASE_URL_OPTIONS.map((o) => (
                            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                    </Select>
                    <FormHelperText>Используйте тестовую среду (edu) для проверки интеграции</FormHelperText>
                </FormControl>

                <TextField
                    fullWidth
                    label="Client ID (Идентификатор клиента)"
                    value={form.CDEK_CLIENT_ID}
                    onChange={handleChange('CDEK_CLIENT_ID')}
                    sx={{ mb: 2 }}
                    autoComplete="off"
                />

                <TextField
                    fullWidth
                    label="Client Secret (Секрет клиента)"
                    type={secretEditing ? 'text' : 'password'}
                    value={form.CDEK_CLIENT_SECRET}
                    onChange={handleChange('CDEK_CLIENT_SECRET')}
                    onFocus={handleSecretFocus}
                    sx={{ mb: 1 }}
                    autoComplete="new-password"
                    helperText={!secretEditing && form.CDEK_CLIENT_SECRET === PLACEHOLDER ? 'Секрет сохранён. Нажмите для изменения.' : ''}
                />

                <TextField
                    label="Код тарифа"
                    value={form.CDEK_TARIFF_CODE}
                    onChange={handleChange('CDEK_TARIFF_CODE')}
                    type="number"
                    sx={{ width: 180 }}
                    helperText="482 = дверь-дверь"
                />
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>Отправитель (ваш склад)</Typography>

                <Stack direction="row" gap={2} mb={2}>
                    <TextField
                        label="Код города СДЭК"
                        value={form.CDEK_SENDER_CITY_CODE}
                        onChange={handleChange('CDEK_SENDER_CITY_CODE')}
                        type="number"
                        sx={{ width: 200 }}
                        helperText="Напр. 44 = Москва, 72 = Петропавловск-Казахстанский"
                    />
                    <TextField
                        fullWidth
                        label="Адрес склада"
                        value={form.CDEK_SENDER_ADDRESS}
                        onChange={handleChange('CDEK_SENDER_ADDRESS')}
                        helperText="ул. Ленина 1, склад 3"
                    />
                </Stack>

                <Stack direction="row" gap={2} mb={2}>
                    <TextField
                        fullWidth
                        label="Имя отправителя"
                        value={form.CDEK_SENDER_NAME}
                        onChange={handleChange('CDEK_SENDER_NAME')}
                    />
                    <TextField
                        fullWidth
                        label="Компания"
                        value={form.CDEK_SENDER_COMPANY}
                        onChange={handleChange('CDEK_SENDER_COMPANY')}
                    />
                </Stack>

                <Stack direction="row" gap={2}>
                    <TextField
                        fullWidth
                        label="Телефон отправителя"
                        value={form.CDEK_SENDER_PHONE}
                        onChange={handleChange('CDEK_SENDER_PHONE')}
                        placeholder="+77001234567"
                        helperText="Формат E.164: +7XXXXXXXXXX"
                    />
                    <TextField
                        fullWidth
                        label="Email отправителя"
                        value={form.CDEK_SENDER_EMAIL}
                        onChange={handleChange('CDEK_SENDER_EMAIL')}
                        type="email"
                    />
                </Stack>
            </Paper>

            <Button
                variant="contained"
                size="large"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveOutlinedIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{ backgroundColor: '#00AB6D', '&:hover': { backgroundColor: '#009960' } }}
            >
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
        </Box>
    );
};

export default CdekSettingsPage;
