import { useCallback, useEffect, useState } from 'react';
import {
    Alert, Box, Button, Chip, CircularProgress, Collapse, Divider, FormControl,
    FormHelperText, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography
} from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
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
    CDEK_TARIFF_CODE: '482',
    CDEK_TARIFF_CODE_PVZ: '483'
};

const CdekSettingsPage = () => {
    const [form, setForm] = useState(DEFAULT);
    const [secretEditing, setSecretEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [testResult, setTestResult] = useState(null);
    const [testing, setTesting] = useState(false);

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

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch(apiUrl('/admin/settings/cdek/test'), {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminAuthStorage.getToken()}`, 'Content-Type': 'application/json' }
            });
            const body = await res.json().catch(() => ({}));
            setTestResult({ ok: !!body.ok, error: body.error, steps: body.steps || [] });
        } catch (e) {
            setTestResult({ ok: false, error: e.message, steps: [] });
        } finally {
            setTesting(false);
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

                <Stack direction="row" gap={2} flexWrap="wrap">
                    <TextField
                        label="Тариф дверь-дверь"
                        value={form.CDEK_TARIFF_CODE}
                        onChange={handleChange('CDEK_TARIFF_CODE')}
                        type="number"
                        sx={{ width: 220 }}
                        helperText="Обычно 482"
                    />
                    <TextField
                        label="Тариф дверь-ПВЗ"
                        value={form.CDEK_TARIFF_CODE_PVZ}
                        onChange={handleChange('CDEK_TARIFF_CODE_PVZ')}
                        type="number"
                        sx={{ width: 220 }}
                        helperText="Обычно 483"
                    />
                </Stack>
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

            <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
                <Button
                    variant="contained"
                    size="large"
                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveOutlinedIcon />}
                    onClick={handleSave}
                    disabled={saving || testing}
                    sx={{ backgroundColor: '#00AB6D', '&:hover': { backgroundColor: '#009960' } }}
                >
                    {saving ? 'Сохранение...' : 'Сохранить настройки'}
                </Button>
                <Button
                    variant="outlined"
                    size="large"
                    startIcon={testing ? <CircularProgress size={18} /> : <PlayCircleOutlineIcon />}
                    onClick={handleTest}
                    disabled={saving || testing}
                >
                    {testing ? 'Проверка...' : 'Тест подключения'}
                </Button>
            </Stack>

            {testResult && (
                <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                        Результат теста: {testResult.ok
                            ? <Chip label="OK" color="success" size="small" sx={{ ml: 1 }} />
                            : <Chip label="Ошибка" color="error" size="small" sx={{ ml: 1 }} />}
                    </Typography>
                    {testResult.error && (
                        <Alert severity="error" sx={{ mb: 1 }}>{testResult.error}</Alert>
                    )}
                    {(testResult.steps || []).map((s, i) => (
                        <Box key={i} sx={{ mb: 1, pl: 1, borderLeft: '3px solid', borderColor: s.ok === false ? 'error.main' : s.ok === true ? 'success.main' : 'grey.400' }}>
                            <Typography variant="caption" fontWeight={600}>{s.step}</Typography>
                            <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {JSON.stringify(s, null, 2)}
                            </pre>
                        </Box>
                    ))}
                </Paper>
            )}
        </Box>
    );
};

export default CdekSettingsPage;
