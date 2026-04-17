import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Button, Stack, Text, TextInput, Title } from '@mantine/core';
import { apiUrl } from '../../config/api';
import { IconPhone } from '../../icons';

const formatDisplay = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    let out = '';
    if (digits.length > 0) out = '+' + digits[0];
    if (digits.length > 1) out += ' (' + digits.slice(1, 4);
    if (digits.length >= 4) out += ') ' + digits.slice(4, 7);
    if (digits.length >= 7) out += '-' + digits.slice(7, 9);
    if (digits.length >= 9) out += '-' + digits.slice(9, 11);
    return out;
};

const PhoneAuth = ({ onCodeSent, phoneNumber: initialPhoneNumber }) => {
    const { t } = useTranslation();
    const [phone, setPhone] = useState(initialPhoneNumber ? '+7' + initialPhoneNumber : '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setError('');
        setPhone(formatDisplay(e.target.value));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 11) {
            setError(t('auth.phone.invalid'));
            return;
        }
        const normalized = digits.slice(1);
        setLoading(true);
        try {
            await axios.post(apiUrl('/auth/register-login'), { phoneNumber: normalized });
            onCodeSent(normalized);
        } catch {
            setError(t('auth.phone.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stack gap="md">
                <Stack gap={4}>
                    <Title order={3} fw={700} style={{ letterSpacing: '-0.02em' }}>
                        {t('auth.phone.title')}
                    </Title>
                    <Text size="sm" c="dimmed">{t('auth.phone.subtitle')}</Text>
                </Stack>
                <TextInput
                    label={t('auth.phone.label')}
                    placeholder={t('auth.phone.placeholder')}
                    value={phone}
                    onChange={handleChange}
                    type="tel"
                    error={error}
                    size="md"
                    radius="md"
                    leftSection={<IconPhone size={16} stroke={1.7} />}
                    autoFocus
                />
                <Button
                    type="submit"
                    color="greenman"
                    fullWidth
                    size="md"
                    radius="xl"
                    loading={loading}
                    mt={4}
                >
                    {t('auth.phone.cta')}
                </Button>
            </Stack>
        </form>
    );
};

export default PhoneAuth;
