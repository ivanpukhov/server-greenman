import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    ActionIcon,
    Loader,
    SegmentedControl,
    Stack,
    TextInput,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../config/api';
import { IconSearch, IconArrowRight } from '../../icons';
import styles from './SearchBlock.module.scss';

const MIN_LEN = 2;
const DEBOUNCE_MS = 180;

const SearchBlock = ({
    initialType = 'name',
    initialQuery = '',
    autoFocus = false,
    onSubmit,
}) => {
    const { t } = useTranslation();
    const [type, setType] = useState(initialType);
    const [query, setQuery] = useState(initialQuery);
    const [suggestions, setSuggestions] = useState([]);
    const [suggLoading, setSuggLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const navigate = useNavigate();
    const wrapRef = useRef(null);
    const abortRef = useRef(null);

    useEffect(() => {
        setType(initialType);
    }, [initialType]);
    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < MIN_LEN) {
            setSuggestions([]);
            setSuggLoading(false);
            return undefined;
        }
        setSuggLoading(true);
        const id = setTimeout(async () => {
            abortRef.current?.abort?.();
            const controller = new AbortController();
            abortRef.current = controller;
            try {
                const { data } = await axios.get(
                    apiUrl(`/products/search/${encodeURIComponent(trimmed)}`),
                    { params: { type }, signal: controller.signal },
                );
                setSuggestions(Array.isArray(data) ? data.slice(0, 5) : []);
            } catch (err) {
                if (err?.name !== 'CanceledError') setSuggestions([]);
            } finally {
                setSuggLoading(false);
            }
        }, DEBOUNCE_MS);
        return () => {
            clearTimeout(id);
            abortRef.current?.abort?.();
        };
    }, [query, type]);

    useEffect(() => {
        const onDocDown = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocDown);
        return () => document.removeEventListener('mousedown', onDocDown);
    }, []);

    const submit = () => {
        const trimmed = query.trim();
        if (!trimmed) return;
        navigate(`/search/${type}/${encodeURIComponent(trimmed)}`);
        setOpen(false);
        onSubmit?.();
    };

    const pickSuggestion = (product) => {
        setOpen(false);
        navigate(`/product/${product.id}`);
        onSubmit?.();
    };

    const onKeyDown = (e) => {
        if (!open || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) =>
                i <= 0 ? suggestions.length - 1 : i - 1,
            );
        } else if (e.key === 'Enter' && active >= 0) {
            e.preventDefault();
            pickSuggestion(suggestions[active]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
            ref={wrapRef}
            className={styles.wrap}
        >
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
                <div className={styles.inputWrap}>
                    <TextInput
                        size="lg"
                        radius="xl"
                        placeholder={
                            type === 'name'
                                ? t('header.search_placeholder_name')
                                : t('header.search_placeholder_disease')
                        }
                        value={query}
                        onChange={(e) => {
                            setQuery(e.currentTarget.value);
                            setOpen(true);
                            setActive(-1);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={onKeyDown}
                        leftSection={
                            suggLoading ? (
                                <Loader size={16} color="greenman" />
                            ) : (
                                <IconSearch size={18} stroke={1.7} />
                            )
                        }
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
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={open && suggestions.length > 0}
                    />
                    {open && suggestions.length > 0 && (
                        <ul className={styles.dropdown} role="listbox">
                            {suggestions.map((p, i) => (
                                <li
                                    key={p.id}
                                    className={`${styles.item} ${i === active ? styles.itemActive : ''}`}
                                    role="option"
                                    aria-selected={i === active}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => pickSuggestion(p)}
                                >
                                    <span className={styles.itemName}>
                                        {p.name}
                                    </span>
                                    {p.types?.[0]?.price ? (
                                        <span className={styles.itemPrice}>
                                            {p.types[0].price} ₸
                                        </span>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Stack>
        </form>
    );
};

export default SearchBlock;
