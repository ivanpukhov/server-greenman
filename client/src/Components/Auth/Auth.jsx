import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Paper, Stack, Text, Title } from '@mantine/core';
import { hasValidSiteSession } from '../../AuthContext.jsx';
import PhoneAuth from './PhoneAuth.jsx';
import CodeConfirm from './CodeConfirm.jsx';
import { IconLeaf } from '../../icons';

const Auth = () => {
    const { t } = useTranslation();
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
        <Box
            style={{
                minHeight: '100vh',
                background:
                    'radial-gradient(1200px 600px at 100% 0%, var(--mantine-color-greenman-1), transparent), radial-gradient(900px 500px at 0% 100%, var(--mantine-color-greenman-0), transparent), #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 16px',
            }}
        >
            <Helmet>
                <title>{t('auth.seo_title')}</title>
            </Helmet>
            <Paper shadow="sm" radius="xl" p="xl" w="100%" maw={440} withBorder>
                <Stack gap="xl">
                    <Stack gap={6} align="center">
                        <Box
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: 16,
                                background:
                                    'linear-gradient(135deg, var(--mantine-color-greenman-0), var(--mantine-color-greenman-2))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <IconLeaf size={28} stroke={1.6} color="var(--mantine-color-greenman-7)" />
                        </Box>
                        <Title order={3} fw={800} style={{ letterSpacing: '-0.02em' }}>
                            {t('common.brand')}
                        </Title>
                        <Text size="xs" c="dimmed">{t('common.tagline')}</Text>
                    </Stack>
                    {step === 1 ? (
                        <PhoneAuth onCodeSent={handleCodeSent} phoneNumber={phoneNumber} />
                    ) : (
                        <CodeConfirm phoneNumber={phoneNumber} onPhoneNumberChange={() => setStep(1)} />
                    )}
                </Stack>
            </Paper>
        </Box>
    );
};

export default Auth;
