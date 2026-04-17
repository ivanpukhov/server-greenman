import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Accordion, Box, Paper, Stack, Text, Title } from '@mantine/core';
import { hasValidSiteSession } from '../../AuthContext.jsx';
import PhoneAuth from './PhoneAuth.jsx';
import CodeConfirm from './CodeConfirm.jsx';
import { IconLeaf, IconShieldCheck } from '../../icons';

const safeRedirect = (raw) => {
    if (!raw) return '/profile';
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/profile';
    return raw;
};

const Auth = () => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [phoneNumber, setPhoneNumber] = useState('');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = safeRedirect(searchParams.get('redirect'));

    useEffect(() => {
        if (hasValidSiteSession()) navigate(redirectTo, { replace: true });
    }, [navigate, redirectTo]);

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
                        <CodeConfirm
                            phoneNumber={phoneNumber}
                            onPhoneNumberChange={() => setStep(1)}
                            redirectTo={redirectTo}
                        />
                    )}

                    <Accordion variant="separated" radius="md">
                        <Accordion.Item value="why">
                            <Accordion.Control
                                icon={
                                    <IconShieldCheck
                                        size={16}
                                        stroke={1.7}
                                        color="var(--mantine-color-greenman-7)"
                                    />
                                }
                            >
                                <Text size="sm" fw={600}>
                                    {t('auth.why.title')}
                                </Text>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Text size="sm" c="dimmed">
                                    {t('auth.why.body')}
                                </Text>
                            </Accordion.Panel>
                        </Accordion.Item>
                    </Accordion>
                </Stack>
            </Paper>
        </Box>
    );
};

export default Auth;
