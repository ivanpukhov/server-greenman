import { useState } from 'react';
import { Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useLogin, useNotify } from 'react-admin';
import { apiUrl } from '../config/api';

const normalizePhone = (value) => value.replace(/\D/g, '');

const AdminLoginPage = () => {
    const [step, setStep] = useState(1);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const login = useLogin();
    const notify = useNotify();

    const requestCode = async () => {
        const normalized = normalizePhone(phoneNumber);

        if (normalized.length < 10) {
            notify('Введите корректный номер телефона', { type: 'warning' });
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(apiUrl('/admin/auth/request-code'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: normalized })
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(body.message || 'Не удалось отправить код');
            }

            setStep(2);
            notify('Код отправлен в WhatsApp', { type: 'info' });
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const submitCode = async () => {
        const normalized = normalizePhone(phoneNumber);
        const cleanCode = code.replace(/\D/g, '');

        if (cleanCode.length !== 6) {
            notify('Введите 6-значный код', { type: 'warning' });
            return;
        }

        setLoading(true);

        try {
            await login({ phoneNumber: normalized, confirmationCode: cleanCode });
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
                    borderRadius: 5,
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
                        Вход по номеру телефона и одноразовому коду
                    </Typography>

                    <Stack spacing={2.2}>
                        <TextField
                            label="Телефон"
                            placeholder="+7 (777) 546-44-50"
                            value={phoneNumber}
                            onChange={(event) => setPhoneNumber(event.target.value)}
                            fullWidth
                            disabled={loading || step === 2}
                        />

                        {step === 2 && (
                            <TextField
                                label="Код подтверждения"
                                placeholder="6 цифр"
                                value={code}
                                onChange={(event) => setCode(event.target.value)}
                                fullWidth
                                disabled={loading}
                            />
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
                                    }}
                                    disabled={loading}
                                >
                                    Изменить номер
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
