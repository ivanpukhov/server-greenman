import React from 'react';
import { Accordion, Anchor, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconHelpCircle, IconBrandWhatsapp } from '../../icons';

const Faq = () => {
    const { t } = useTranslation();
    const items = t('main.faq.items', { returnObjects: true });

    const renderAnswer = (text) => {
        const parts = text.split('WhatsApp');
        if (parts.length === 1) return text;
        return parts.map((part, i) => (
            <React.Fragment key={i}>
                {part}
                {i < parts.length - 1 && (
                    <Anchor
                        href="https://wa.me/77770978675"
                        target="_blank"
                        rel="noreferrer"
                        c="greenman"
                        inline
                        fw={600}
                    >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                            <IconBrandWhatsapp size={15} stroke={1.8} />
                            WhatsApp
                        </span>
                    </Anchor>
                )}
            </React.Fragment>
        ));
    };

    return (
        <section style={{ marginTop: 72 }}>
            <Stack gap={4} align="center" mb="xl">
                <Text size="sm" fw={600} c="greenman" tt="uppercase" lts={0.8}>
                    {t('main.faq.subtitle')}
                </Text>
                <Title order={2} ta="center" style={{ letterSpacing: '-0.02em' }}>
                    {t('main.faq.title')}
                </Title>
            </Stack>

            <Accordion
                radius="lg"
                variant="separated"
                chevronPosition="right"
                styles={{
                    item: {
                        border: '1px solid var(--mantine-color-gray-2)',
                        background: '#fff',
                        marginBottom: 8,
                    },
                    control: { fontWeight: 600, padding: '18px 20px' },
                    label: { color: '#0b1712' },
                }}
            >
                {items.map((item, index) => (
                    <Accordion.Item key={index} value={String(index)}>
                        <Accordion.Control
                            icon={<IconHelpCircle size={20} stroke={1.7} color="var(--mantine-color-greenman-7)" />}
                        >
                            {item.q}
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Text size="sm" c="dimmed" lh={1.65}>
                                {renderAnswer(item.a)}
                            </Text>
                        </Accordion.Panel>
                    </Accordion.Item>
                ))}
            </Accordion>
        </section>
    );
};

export default Faq;
