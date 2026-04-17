import React from 'react';
import { Modal, Stack, Text, Title, UnstyledButton, Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useCountry } from '../../contexts/CountryContext';
import { IconArrowRight } from '../../icons';
import s from './CountryModal.module.scss';

const OPTIONS = [
    { code: 'KZ', flag: '🇰🇿', currency: '₸', i18nKey: 'country.kz' },
    { code: 'RF', flag: '🇷🇺', currency: '₽', i18nKey: 'country.rf' },
];

const CountryModal = () => {
    const { t } = useTranslation();
    const { hasChosen, setCountry } = useCountry();

    return (
        <Modal
            opened={!hasChosen}
            onClose={() => {}}
            withCloseButton={false}
            closeOnEscape={false}
            closeOnClickOutside={false}
            size="md"
            radius="xl"
            padding="xl"
        >
            <Stack gap="xs" align="center" mb="lg">
                <Title order={3} ta="center">{t('country.choose_title')}</Title>
                <Text size="sm" c="dimmed" ta="center">{t('country.choose_subtitle')}</Text>
            </Stack>

            <Stack gap="sm">
                {OPTIONS.map((opt) => (
                    <UnstyledButton
                        key={opt.code}
                        className={s.option}
                        onClick={() => setCountry(opt.code)}
                    >
                        <Group gap="md" wrap="nowrap">
                            <span className={s.flag}>{opt.flag}</span>
                            <Stack gap={2}>
                                <Text fw={600}>{t(opt.i18nKey)}</Text>
                                <Text size="xs" c="dimmed">{opt.currency}</Text>
                            </Stack>
                        </Group>
                        <IconArrowRight size={18} stroke={1.8} />
                    </UnstyledButton>
                ))}
            </Stack>
        </Modal>
    );
};

export default CountryModal;
