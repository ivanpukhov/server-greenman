import React from 'react';
import { Menu, UnstyledButton, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useCountry } from '../../contexts/CountryContext';
import { useCart } from '../../CartContext';
import { IconMapPin, IconCheck, IconChevronDown } from '../../icons';
import s from './CountrySwitcher.module.scss';

const OPTIONS = [
    { code: 'KZ', flag: '🇰🇿', currency: '₸', i18nKey: 'country.kz' },
    { code: 'RF', flag: '🇷🇺', currency: '₽', i18nKey: 'country.rf' },
];

const CountrySwitcher = ({ compact = false }) => {
    const { t } = useTranslation();
    const { country, setCountry } = useCountry();
    const { cart, clearCart } = useCart();
    const current = OPTIONS.find((o) => o.code === country) || OPTIONS[0];

    const handleSelect = (nextCode) => {
        if (nextCode === country) return;
        if (cart.length > 0) {
            const ok = window.confirm('При смене страны корзина будет очищена. Продолжить?');
            if (!ok) return;
            clearCart();
        }
        setCountry(nextCode);
    };

    return (
        <Menu shadow="md" width={200} position="bottom-end" offset={8}>
            <Menu.Target>
                <UnstyledButton className={s.trigger} aria-label={t('country.label')}>
                    <IconMapPin size={16} stroke={1.7} />
                    <span className={s.flag}>{current.flag}</span>
                    {!compact && <span className={s.currency}>{current.currency}</span>}
                    <IconChevronDown size={14} stroke={1.8} className={s.caret} />
                </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
                {OPTIONS.map((opt) => {
                    const active = opt.code === country;
                    return (
                        <Menu.Item
                            key={opt.code}
                            onClick={() => handleSelect(opt.code)}
                            leftSection={<span style={{ fontSize: 18 }}>{opt.flag}</span>}
                            rightSection={active ? <IconCheck size={16} color="var(--mantine-color-greenman-6)" /> : null}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <Text size="sm" fw={active ? 600 : 500}>{t(opt.i18nKey)}</Text>
                                <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>{opt.currency}</Text>
                            </div>
                        </Menu.Item>
                    );
                })}
            </Menu.Dropdown>
        </Menu>
    );
};

export default CountrySwitcher;
