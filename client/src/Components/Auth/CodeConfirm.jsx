import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Anchor, Button, Group, PinInput, Stack, Text, Title } from '@mantine/core';
import { apiUrl } from '../../config/api';
import { useAuth } from '../../AuthContext.jsx';

const RESEND_COOLDOWN = 45;

const prettifyPhone = (p) => {
    const m = (p || '').match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
    return m ? `+7 (${m[1]}) ${m[2]}-${m[3]}-${m[4]}` : `+7${p || ''}`;
};

const CodeConfirm = ({ phoneNumber, onPhoneNumberChange, redirectTo = '/profile' }) => {
    const { t } = useTranslation();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (code.length < 6) {
            setError(t('auth.code.invalid'));
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(apiUrl('/auth/confirm-code'), {
                phoneNumber,
                confirmationCode: code,
            });
            login(res.data.token);
            localStorage.setItem('userId', String(res.data.userId));
            navigate(redirectTo, { replace: true });
        } catch {
            setError(t('auth.code.wrong'));
        } finally {
            setLoading(false);
        }
    };

    const resendCode = async () => {
        if (cooldown > 0) return;
        try {
            await axios.post(apiUrl('/auth/resend-confirmation-code'), { phoneNumber });
            setCooldown(RESEND_COOLDOWN);
        } catch {
            setError(t('auth.code.resend_error'));
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stack gap="md">
                <Stack gap={4}>
                    <Title order={3} fw={700} style={{ letterSpacing: '-0.02em' }}>
                        {t('auth.code.title')}
                    </Title>
                    <Text size="sm" c="dimmed">
                        {t('auth.code.subtitle')}: <Text component="span" fw={600} c="dark">{prettifyPhone(phoneNumber)}</Text>
                    </Text>
                </Stack>
                <Group justify="center">
                    <PinInput
                        length={6}
                        type="number"
                        value={code}
                        onChange={(v) => { setCode(v); setError(''); }}
                        error={!!error}
                        size="md"
                        oneTimeCode
                        autoFocus
                    />
                </Group>
                {error && <Text c="red" size="sm" ta="center">{error}</Text>}
                <Button type="submit" color="greenman" fullWidth size="md" radius="xl" loading={loading}>
                    {t('auth.code.cta')}
                </Button>
                <Group justify="center" gap="lg" mt={4}>
                    {cooldown > 0 ? (
                        <Text size="sm" c="dimmed">
                            {t('auth.code.resend_in', { seconds: cooldown })}
                        </Text>
                    ) : (
                        <Anchor size="sm" onClick={resendCode} c="greenman" fw={600}>
                            {t('auth.code.resend')}
                        </Anchor>
                    )}
                    <Anchor size="sm" onClick={onPhoneNumberChange} c="dimmed">
                        {t('auth.code.change_phone')}
                    </Anchor>
                </Group>
            </Stack>
        </form>
    );
};

export default CodeConfirm;
