import React from 'react';
import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconBrandWhatsapp, IconBrandInstagram, IconPhone } from '../../icons';
import s from './Banner.module.scss';

const WA = 'https://wa.me/77770978675';
const IG = 'https://www.instagram.com/greenman_kazakstan/';
const PHONE = '+7 777 097 8675';
const PHONE_TEL = 'tel:+77770978675';

const Banner = () => {
    const { t } = useTranslation();

    return (
        <section className={s.banner}>
            <div className={s.decor} aria-hidden="true" />
            <Stack gap="xs" maw={560}>
                <Text size="sm" fw={600} c="greenman" tt="uppercase" lts={0.8}>
                    {t('banner.eyebrow')}
                </Text>
                <Title order={2} className={s.title}>
                    {t('banner.title')}
                </Title>
                <Text c="dimmed" size="md">
                    {t('banner.subtitle')}
                </Text>
            </Stack>

            <Group gap="sm" mt="md" className={s.actions}>
                <Button
                    component="a"
                    href={WA}
                    target="_blank"
                    rel="noreferrer"
                    size="md"
                    color="greenman"
                    leftSection={<IconBrandWhatsapp size={18} stroke={1.8} />}
                >
                    {t('banner.whatsapp')}
                </Button>
                <Button
                    component="a"
                    href={PHONE_TEL}
                    size="md"
                    variant="default"
                    leftSection={<IconPhone size={18} stroke={1.8} />}
                >
                    {PHONE}
                </Button>
                <Button
                    component="a"
                    href={IG}
                    target="_blank"
                    rel="noreferrer"
                    size="md"
                    variant="subtle"
                    color="greenman"
                    leftSection={<IconBrandInstagram size={18} stroke={1.8} />}
                >
                    {t('banner.instagram')}
                </Button>
            </Group>
        </section>
    );
};

export default Banner;
