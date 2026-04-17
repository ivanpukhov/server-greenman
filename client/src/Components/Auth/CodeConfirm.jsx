import React, { useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../../config/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { Anchor, Button, Group, PinInput, Stack, Text, Title } from '@mantine/core';

const CodeConfirm = ({ phoneNumber, onPhoneNumberChange }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (code.length < 6) {
            setError('Введите все 6 цифр кода');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await axios.post(apiUrl('/auth/confirm-code'), {
                phoneNumber,
                confirmationCode: code
            });
            login(response.data.token);
            localStorage.setItem('userId', String(response.data.userId));
            navigate('/profile');
        } catch {
            setError('Неверный код. Попробуйте ещё раз.');
        } finally {
            setLoading(false);
        }
    };

    const resendCode = async () => {
        try {
            await axios.post(apiUrl('/auth/resend-confirmation-code'), { phoneNumber });
        } catch {
            setError('Ошибка при повторной отправке.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stack gap="md">
                <Title order={3} fw={600}>Подтверждение</Title>
                <Text size="sm" c="dimmed">
                    Код отправлен на номер: <strong>+7{phoneNumber}</strong>
                </Text>
                <PinInput
                    length={6}
                    type="number"
                    value={code}
                    onChange={(val) => { setCode(val); setError(''); }}
                    error={!!error}
                    size="md"
                    oneTimeCode
                />
                {error && <Text c="red" size="sm">{error}</Text>}
                <Button type="submit" color="greenman" fullWidth size="md" radius="md" loading={loading}>
                    Подтвердить
                </Button>
                <Group justify="center" gap="xs">
                    <Anchor size="sm" onClick={resendCode} c="greenman">Отправить повторно</Anchor>
                    <Text size="sm" c="dimmed">·</Text>
                    <Anchor size="sm" onClick={onPhoneNumberChange} c="dimmed">Изменить номер</Anchor>
                </Group>
            </Stack>
        </form>
    );
};

export default CodeConfirm;
