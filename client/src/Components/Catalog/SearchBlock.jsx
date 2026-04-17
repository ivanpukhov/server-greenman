import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionIcon, SegmentedControl, Stack, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconSearch, IconArrowRight } from '../../icons';

const SearchBlock = ({ initialType = 'name', initialQuery = '', autoFocus = false, onSubmit }) => {
    const { t } = useTranslation();
    const [type, setType] = useState(initialType);
    const [query, setQuery] = useState(initialQuery);
    const navigate = useNavigate();

    useEffect(() => {
        setType(initialType);
    }, [initialType]);

    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    const handleSubmit = (e) => {
        e?.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        navigate(`/search/${type}/${encodeURIComponent(trimmed)}`);
        onSubmit?.();
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stack gap="sm">
                <SegmentedControl
                    value={type}
                    onChange={setType}
                    fullWidth
                    radius="xl"
                    data={[
                        { label: t('search.by_name'), value: 'name' },
                        { label: t('search.by_disease'), value: 'disease' },
                    ]}
                />
                <TextInput
                    size="lg"
                    radius="xl"
                    placeholder={
                        type === 'name'
                            ? t('header.search_placeholder_name')
                            : t('header.search_placeholder_disease')
                    }
                    value={query}
                    onChange={(e) => setQuery(e.currentTarget.value)}
                    leftSection={<IconSearch size={18} stroke={1.7} />}
                    rightSection={
                        <ActionIcon
                            type="submit"
                            size="lg"
                            radius="xl"
                            variant="filled"
                            color="greenman"
                            aria-label={t('search.title')}
                            disabled={!query.trim()}
                        >
                            <IconArrowRight size={18} stroke={1.8} />
                        </ActionIcon>
                    }
                    rightSectionWidth={48}
                    autoFocus={autoFocus}
                />
            </Stack>
        </form>
    );
};

export default SearchBlock;
