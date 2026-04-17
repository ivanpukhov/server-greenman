import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const DEFAULTS = {
    search: '',
    diseases: [],
    priceMin: '',
    priceMax: '',
    inStock: false,
    sort: 'popular',
};

const SORT_VALUES = new Set([
    'popular',
    'new',
    'price_asc',
    'price_desc',
    'name',
]);

const parseFilters = (sp) => {
    const search = sp.get('q') || '';
    const diseasesRaw = sp.get('diseases') || '';
    const diseases = diseasesRaw
        ? diseasesRaw.split(',').map((d) => d.trim()).filter(Boolean)
        : [];
    const priceMin = sp.get('priceMin') || '';
    const priceMax = sp.get('priceMax') || '';
    const inStock = sp.get('inStock') === '1';
    const sortRaw = sp.get('sort') || 'popular';
    const sort = SORT_VALUES.has(sortRaw) ? sortRaw : 'popular';
    return { search, diseases, priceMin, priceMax, inStock, sort };
};

const serialize = (filters) => {
    const next = new URLSearchParams();
    if (filters.search) next.set('q', filters.search);
    if (filters.diseases?.length) next.set('diseases', filters.diseases.join(','));
    if (filters.priceMin !== '' && filters.priceMin !== null && filters.priceMin !== undefined) {
        next.set('priceMin', String(filters.priceMin));
    }
    if (filters.priceMax !== '' && filters.priceMax !== null && filters.priceMax !== undefined) {
        next.set('priceMax', String(filters.priceMax));
    }
    if (filters.inStock) next.set('inStock', '1');
    if (filters.sort && filters.sort !== 'popular') next.set('sort', filters.sort);
    return next;
};

export function useCatalogFilters() {
    const [searchParams, setSearchParams] = useSearchParams();

    const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

    const setFilters = useCallback(
        (updater) => {
            const current = parseFilters(searchParams);
            const next =
                typeof updater === 'function' ? updater(current) : { ...current, ...updater };
            setSearchParams(serialize(next), { replace: false });
        },
        [searchParams, setSearchParams],
    );

    const reset = useCallback(() => {
        setSearchParams(new URLSearchParams(), { replace: false });
    }, [setSearchParams]);

    const isActive = useMemo(() => {
        return (
            filters.search !== DEFAULTS.search ||
            filters.diseases.length > 0 ||
            filters.priceMin !== DEFAULTS.priceMin ||
            filters.priceMax !== DEFAULTS.priceMax ||
            filters.inStock !== DEFAULTS.inStock
        );
    }, [filters]);

    const apiQuery = useMemo(() => {
        const qp = new URLSearchParams();
        if (filters.search) qp.set('search', filters.search);
        if (filters.diseases.length) qp.set('diseases', filters.diseases.join(','));
        if (filters.priceMin !== '') qp.set('priceMin', String(filters.priceMin));
        if (filters.priceMax !== '') qp.set('priceMax', String(filters.priceMax));
        if (filters.inStock) qp.set('inStock', 'true');
        if (filters.sort) qp.set('sort', filters.sort);
        return qp;
    }, [filters]);

    return { filters, setFilters, reset, isActive, apiQuery };
}

export { DEFAULTS, SORT_VALUES };
