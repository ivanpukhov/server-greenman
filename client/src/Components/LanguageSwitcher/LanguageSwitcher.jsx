import React from 'react';
import { Menu, UnstyledButton, Text, rem } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconLanguage, IconCheck, IconChevronDown } from '../../icons';
import s from './LanguageSwitcher.module.scss';

const LANGS = [
    { code: 'ru', label: 'RU', name: 'Русский' },
    { code: 'kz', label: 'KZ', name: 'Қазақша' },
    { code: 'en', label: 'EN', name: 'English' },
];

const LanguageSwitcher = ({ compact = false }) => {
    const { i18n } = useTranslation();
    const current = LANGS.find((l) => l.code === i18n.resolvedLanguage) || LANGS[0];

    return (
        <Menu shadow="md" width={180} position="bottom-end" offset={8}>
            <Menu.Target>
                <UnstyledButton className={s.trigger}>
                    <IconLanguage size={18} stroke={1.7} />
                    {!compact && <span className={s.label}>{current.label}</span>}
                    <IconChevronDown size={14} stroke={1.8} className={s.caret} />
                </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
                {LANGS.map((lang) => {
                    const active = lang.code === current.code;
                    return (
                        <Menu.Item
                            key={lang.code}
                            onClick={() => i18n.changeLanguage(lang.code)}
                            rightSection={active ? <IconCheck size={16} stroke={2} color="var(--mantine-color-greenman-6)" /> : null}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <Text size="sm" fw={active ? 600 : 500}>{lang.name}</Text>
                                <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>{lang.label}</Text>
                            </div>
                        </Menu.Item>
                    );
                })}
            </Menu.Dropdown>
        </Menu>
    );
};

export default LanguageSwitcher;
