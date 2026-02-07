import { useState } from 'react';
import { Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useLogin, useNotify } from 'react-admin';

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
            const response = await fetch('/api/admin/auth/request-code', {
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
                background: 'linear-gradient(145deg, #eaf5ea 0%, #f6efe3 100%)',
                px: 2
            }}
        >
            <Card sx={{ width: '100%', maxWidth: 460, boxShadow: '0 24px 70px rgba(20,108,67,0.20)' }}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h4" sx={{ mb: 1, color: '#123524' }}>
                        Greenman Admin
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: '#5f6c62' }}>
                        Вход по номеру телефона и одноразовому коду
                    </Typography>

                    <Stack spacing={2}>
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
                            <Button variant="contained" onClick={requestCode} disabled={loading} size="large">
                                {loading ? <CircularProgress size={22} color="inherit" /> : 'Отправить код'}
                            </Button>
                        ) : (
                            <>
                                <Button variant="contained" onClick={submitCode} disabled={loading} size="large">
                                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Войти'}
                                </Button>
                                <Button
                                    variant="text"
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
