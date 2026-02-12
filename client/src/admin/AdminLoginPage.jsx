import { useState } from 'react';
import { Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useLogin, useNotify } from 'react-admin';
import { apiUrl } from '../config/api';

const normalizeIin = (value) => value.replace(/\D/g, '').slice(0, 12);

const AdminLoginPage = () => {
    const [step, setStep] = useState(1);
    const [iin, setIin] = useState('');
    const [code, setCode] = useState('');
    const [phoneMask, setPhoneMask] = useState('');
    const [loading, setLoading] = useState(false);

    const login = useLogin();
    const notify = useNotify();

    const requestCode = async () => {
        const normalized = normalizeIin(iin);

        if (normalized.length !== 12) {
            notify('Введите корректный ИИН (12 цифр)', { type: 'warning' });
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(apiUrl('/admin/auth/request-code'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ iin: normalized })
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(body.message || 'Не удалось отправить код');
            }

            setStep(2);
            setPhoneMask(body.phoneMask || '');
            notify('Код отправлен администратору', { type: 'info' });
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const submitCode = async () => {
        const normalized = normalizeIin(iin);
        const cleanCode = code.replace(/\D/g, '');

        if (cleanCode.length !== 6) {
            notify('Введите 6-значный код', { type: 'warning' });
            return;
        }

        setLoading(true);

        try {
            await login({ iin: normalized, confirmationCode: cleanCode });
        } catch (error) {
            notify(error.message || 'Не удалось выполнить вход', { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack
            sx={{
                minHeight: '100vh',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                    'radial-gradient(circle at 15% 20%, rgba(88,196,142,0.34), transparent 45%), radial-gradient(circle at 100% 90%, rgba(19,111,99,0.26), transparent 42%), #f2f8f4',
                px: 2
            }}
        >
            <Card
                sx={{
                    width: '100%',
                    maxWidth: 480,
                    borderRadius: 3,
                    border: '1px solid rgba(16,40,29,0.12)',
                    boxShadow: '0 32px 80px rgba(19,111,99,0.26)',
                    background: 'linear-gradient(180deg, rgba(250,255,252,0.94), rgba(242,250,246,0.94))'
                }}
            >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Typography variant="h4" sx={{ mb: 1, color: '#123524', lineHeight: 1.12 }}>
                        Greenman Admin
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: '#456156' }}>
                        Вход по ИИН и одноразовому коду
                    </Typography>

                    <Stack spacing={2.2}>
                        <TextField
                            label="ИИН"
                            placeholder="12 цифр"
                            value={iin}
                            onChange={(event) => setIin(normalizeIin(event.target.value))}
                            fullWidth
                            disabled={loading || step === 2}
                        />

                        {step === 2 && (
                            <>
                                {phoneMask ? (
                                    <Typography variant="body2" color="text.secondary">
                                        Код отправлен на номер {phoneMask}
                                    </Typography>
                                ) : null}
                                <TextField
                                    label="Код подтверждения"
                                    placeholder="6 цифр"
                                    value={code}
                                    onChange={(event) => setCode(event.target.value)}
                                    fullWidth
                                    disabled={loading}
                                />
                            </>
                        )}

                        {step === 1 ? (
                            <Button
                                variant="contained"
                                onClick={requestCode}
                                disabled={loading}
                                size="large"
                                sx={{ minHeight: 46 }}
                            >
                                {loading ? <CircularProgress size={22} color="inherit" /> : 'Отправить код'}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="contained"
                                    onClick={submitCode}
                                    disabled={loading}
                                    size="large"
                                    sx={{ minHeight: 46 }}
                                >
                                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Войти'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                        setStep(1);
                                        setCode('');
                                        setPhoneMask('');
                                    }}
                                    disabled={loading}
                                >
                                    Изменить ИИН
                                </Button>
                            </>
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </Stack>
    );
};

export default AdminLoginPage;
