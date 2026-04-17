import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ActionIcon, Anchor, Divider, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import logo from '../../images/logo.svg';
import {
    IconBrandWhatsapp,
    IconBrandInstagram,
    IconPhone,
    IconClock,
    IconMapPin,
} from '../../icons';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';
import s from './Footer.module.scss';

const WA = 'https://wa.me/77770978675';
const IG = 'https://www.instagram.com/greenman_kazakstan/';
const PHONE = '+7 777 097 8675';
const PHONE_TEL = 'tel:+77770978675';

const Footer = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const year = new Date().getFullYear();

    if (location.pathname === '/auth') return null;

    return (
        <footer className={s.footer}>
            <div className={s.inner}>
                <div className={s.grid}>
                    <div className={s.brandCol}>
                        <Link to="/" className={s.brand}>
                            <img src={logo} alt="" />
                            <span>{t('common.brand')}</span>
                        </Link>
                        <Text size="sm" c="dimmed" mt="sm" maw={320}>
                            {t('footer.description')}
                        </Text>
                        <Group gap="xs" mt="md">
                            <ActionIcon
                                component="a"
                                href={WA}
                                target="_blank"
                                rel="noreferrer"
                                variant="light"
                                color="greenman"
                                size="lg"
                                radius="xl"
                                aria-label="WhatsApp"
                            >
                                <IconBrandWhatsapp size={18} stroke={1.7} />
                            </ActionIcon>
                            <ActionIcon
                                component="a"
                                href={IG}
                                target="_blank"
                                rel="noreferrer"
                                variant="light"
                                color="greenman"
                                size="lg"
                                radius="xl"
                                aria-label="Instagram"
                            >
                                <IconBrandInstagram size={18} stroke={1.7} />
                            </ActionIcon>
                        </Group>
                    </div>

                    <div className={s.col}>
                        <Text fw={700} size="sm" mb="sm">{t('footer.nav_title')}</Text>
                        <Stack gap={8}>
                            <Link to="/" className={s.link}>{t('header.nav.home')}</Link>
                            <Link to="/catalog" className={s.link}>{t('header.nav.catalog')}</Link>
                            <Link to="/cart" className={s.link}>{t('header.nav.cart')}</Link>
                            <Link to="/profile" className={s.link}>{t('header.nav.profile')}</Link>
                        </Stack>
                    </div>

                    <div className={s.col}>
                        <Text fw={700} size="sm" mb="sm">{t('footer.contacts_title')}</Text>
                        <Stack gap={10}>
                            <Anchor href={PHONE_TEL} c="dark" underline="never" className={s.contactRow}>
                                <IconPhone size={16} stroke={1.7} />
                                <span>{PHONE}</span>
                            </Anchor>
                            <Anchor href={WA} target="_blank" rel="noreferrer" c="dark" underline="never" className={s.contactRow}>
                                <IconBrandWhatsapp size={16} stroke={1.7} />
                                <span>WhatsApp</span>
                            </Anchor>
                            <div className={s.contactRow}>
                                <IconClock size={16} stroke={1.7} />
                                <Text size="sm" c="dimmed">{t('footer.hours')}</Text>
                            </div>
                            <div className={s.contactRow}>
                                <IconMapPin size={16} stroke={1.7} />
                                <Text size="sm" c="dimmed">Petropavlovsk, KZ</Text>
                            </div>
                        </Stack>
                    </div>
                </div>

                <Divider my="xl" />

                <Group justify="space-between" wrap="wrap" gap="md">
                    <Text size="xs" c="dimmed">
                        {t('footer.copyright', { year })}
                    </Text>
                    <LanguageSwitcher />
                </Group>
            </div>
        </footer>
    );
};

export default Footer;
