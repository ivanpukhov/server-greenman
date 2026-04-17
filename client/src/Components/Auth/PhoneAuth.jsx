import React, { useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../../config/api';
import { Button, Stack, Text, TextInput, Title } from '@mantine/core';

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
    const [phone, setPhone] = useState(initialPhoneNumber ? ('+7' + initialPhoneNumber) : '');
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
            setError('Введите корректный номер телефона');
            return;
        }
        const formattedPhoneNumber = digits.slice(1);
        setLoading(true);
        try {
            await axios.post(apiUrl('/auth/register-login'), { phoneNumber: formattedPhoneNumber });
            onCodeSent(formattedPhoneNumber);
        } catch {
            setError('Ошибка при отправке. Попробуйте снова.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stack gap="md">
                <Title order={3} fw={600}>Вход</Title>
                <TextInput
                    label="Номер телефона"
                    placeholder="+7 (000) 000-00-00"
                    value={phone}
                    onChange={handleChange}
                    type="tel"
                    error={error}
                    size="md"
                    radius="md"
                />
                <Button type="submit" color="greenman" fullWidth size="md" radius="md" loading={loading}>
                    Отправить код
                </Button>
            </Stack>
        </form>
    );
};

export default PhoneAuth;
