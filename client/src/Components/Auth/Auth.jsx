import React, { useEffect, useState } from 'react';
import PhoneAuth from './PhoneAuth.jsx';
import CodeConfirm from './CodeConfirm.jsx';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { hasValidSiteSession } from '../../AuthContext.jsx';
import { Box, Center, Paper, Stack, Text, Title } from '@mantine/core';

const Auth = () => {
    const [step, setStep] = useState(1);
    const [phoneNumber, setPhoneNumber] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (hasValidSiteSession()) navigate('/profile');
    }, [navigate]);

    const handleCodeSent = (phone) => {
        setPhoneNumber(phone);
        setStep(2);
    };

    return (
        <Box style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EDF4EF, #E5EEE8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
            <Helmet>
                <title>Войдите в личный кабинет Greenman</title>
                <meta name="description" content="Войдите в свой личный кабинет Greenman, чтобы получить доступ к натуральным лекарственным настойкам, сокам и сиропам." />
            </Helmet>
            <Paper shadow="md" radius="xl" p="xl" w="100%" maw={400}>
                <Stack gap="lg">
                    <Stack gap={4} align="center">
                        <Title order={1} c="greenman" fw={800} size="2rem">GreenMan</Title>
                        <Text c="dimmed" size="sm">Лечебные травы</Text>
                    </Stack>
                    {step === 1
                        ? <PhoneAuth onCodeSent={handleCodeSent} phoneNumber={phoneNumber} />
                        : <CodeConfirm phoneNumber={phoneNumber} onPhoneNumberChange={() => setStep(1)} />
                    }
                </Stack>
            </Paper>
        </Box>
    );
};

export default Auth;
