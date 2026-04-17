import React, { useMemo, useState } from 'react';
import { Checkbox, Switch, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useCountry } from '../../contexts/CountryContext';
import { toDisplayPrice, CURRENCIES } from '../../config/currency';
import { IconSearch } from '../../icons';
import { Button } from '../../ui';
import s from './CatalogFilters.module.scss';

const CatalogFilters = ({
    filters,
    setFilters,
    onReset,
    facets,
    isActive,
    onClose,
}) => {
    const { t } = useTranslation();
    const { country } = useCountry();
    const symbol = CURRENCIES[country]?.symbol || '₸';

    const [searchInput, setSearchInput] = useState(filters.search);
    const [priceMinInput, setPriceMinInput] = useState(filters.priceMin);
    const [priceMaxInput, setPriceMaxInput] = useState(filters.priceMax);

    React.useEffect(() => {
        setSearchInput(filters.search);
    }, [filters.search]);
    React.useEffect(() => {
        setPriceMinInput(filters.priceMin);
        setPriceMaxInput(filters.priceMax);
    }, [filters.priceMin, filters.priceMax]);

    const commitSearch = () => {
        if (searchInput !== filters.search) {
            setFilters({ search: searchInput.trim() });
        }
    };

    const commitPrice = () => {
        if (priceMinInput !== filters.priceMin || priceMaxInput !== filters.priceMax) {
            setFilters({
                priceMin: priceMinInput,
                priceMax: priceMaxInput,
            });
        }
    };

    const topDiseases = useMemo(() => {
        const list = facets?.diseases || [];
        return list.slice(0, 24);
    }, [facets]);

    const priceRange = facets?.priceRange;
    const hintMin = priceRange ? toDisplayPrice(priceRange.min, country) : null;
    const hintMax = priceRange ? toDisplayPrice(priceRange.max, country) : null;

    const toggleDisease = (name) => {
        const has = filters.diseases.includes(name);
        const next = has
            ? filters.diseases.filter((d) => d !== name)
            : [...filters.diseases, name];
        setFilters({ diseases: next });
    };

    return (
        <div className={s.panel}>
            <section className={s.section}>
                <h3 className={s.title}>{t('catalog.filters.search_label')}</h3>
                <TextInput
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.currentTarget.value)}
                    onBlur={commitSearch}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commitSearch();
                    }}
                    placeholder={t('catalog.filters.search_placeholder')}
                    leftSection={<IconSearch size={16} stroke={1.7} />}
                    radius="md"
                    size="sm"
                />
            </section>

            <section className={s.section}>
                <h3 className={s.title}>{t('catalog.filters.price_title')}</h3>
                <div className={s.priceRow}>
                    <TextInput
                        value={priceMinInput}
                        onChange={(e) => setPriceMinInput(e.currentTarget.value)}
                        onBlur={commitPrice}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitPrice();
                        }}
                        placeholder={t('catalog.filters.price_from')}
                        inputMode="numeric"
                        rightSection={<span className={s.symbol}>{symbol}</span>}
                        radius="md"
                        size="sm"
                        className={s.priceInput}
                    />
                    <span className={s.priceDash}>—</span>
                    <TextInput
                        value={priceMaxInput}
                        onChange={(e) => setPriceMaxInput(e.currentTarget.value)}
                        onBlur={commitPrice}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitPrice();
                        }}
                        placeholder={t('catalog.filters.price_to')}
                        inputMode="numeric"
                        rightSection={<span className={s.symbol}>{symbol}</span>}
                        radius="md"
                        size="sm"
                        className={s.priceInput}
                    />
                </div>
                {hintMin !== null && hintMax !== null && (
                    <div className={s.hint}>
                        {hintMin} {symbol} – {hintMax} {symbol}
                    </div>
                )}
            </section>

            <section className={s.section}>
                <Switch
                    checked={filters.inStock}
                    onChange={(e) =>
                        setFilters({ inStock: e.currentTarget.checked })
                    }
                    color="greenman"
                    label={t('catalog.filters.in_stock_only')}
                    labelPosition="left"
                    className={s.switch}
                />
            </section>

            {topDiseases.length > 0 && (
                <section className={s.section}>
                    <h3 className={s.title}>{t('catalog.filters.diseases_title')}</h3>
                    <div className={s.diseaseList}>
                        {topDiseases.map((d) => (
                            <Checkbox
                                key={d.name}
                                checked={filters.diseases.includes(d.name)}
                                onChange={() => toggleDisease(d.name)}
                                color="greenman"
                                size="sm"
                                label={
                                    <span className={s.diseaseLabel}>
                                        <span className={s.diseaseName}>{d.name}</span>
                                        <span className={s.diseaseCount}>{d.count}</span>
                                    </span>
                                }
                                classNames={{
                                    root: s.diseaseCheck,
                                    label: s.diseaseCheckLabel,
                                }}
                            />
                        ))}
                    </div>
                </section>
            )}

            <div className={s.footer}>
                {isActive && (
                    <Button variant="subtle" color="greenman" onClick={onReset}>
                        {t('catalog.reset_filters')}
                    </Button>
                )}
                {onClose && (
                    <Button color="greenman" onClick={onClose} fullWidth>
                        {t('common.close')}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default CatalogFilters;
