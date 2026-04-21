import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  CdekCalculateRequest,
  CdekCalculateResponse,
  CdekCity,
  CdekPvz,
} from '@/lib/api/types';

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

export function useCdekCities(query: string) {
  const debounced = useDebouncedValue(query.trim(), 350);
  return useQuery({
    queryKey: ['cdek', 'cities', debounced],
    enabled: debounced.length >= 2,
    queryFn: async () => {
      const { data } = await api.get<CdekCity[]>(endpoints.cdek.cities, {
        params: { q: debounced },
      });
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useCdekPvz(cityCode: number | null) {
  return useQuery({
    queryKey: ['cdek', 'pvz', cityCode],
    enabled: Number.isFinite(cityCode) && (cityCode ?? 0) > 0,
    queryFn: async () => {
      const { data } = await api.get<CdekPvz[]>(endpoints.cdek.pickupPoints, {
        params: { cityCode },
      });
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useCdekCalculate(
  params: Partial<CdekCalculateRequest> & { cityCode: number | null }
) {
  const debouncedAddress = useDebouncedValue(params.toAddress ?? '', 500);
  const enabled =
    !!params.cityCode &&
    params.products != null &&
    params.products.length > 0 &&
    !!params.deliveryMode &&
    (params.deliveryMode === 'pvz' || debouncedAddress.length > 0);

  const productsKey = JSON.stringify(params.products ?? []);

  return useQuery({
    queryKey: ['cdek', 'calc', params.cityCode, params.deliveryMode, debouncedAddress, productsKey],
    enabled,
    queryFn: async () => {
      const { data } = await api.post<CdekCalculateResponse>(endpoints.cdek.calculate, {
        toCityCode: params.cityCode,
        toAddress: debouncedAddress || undefined,
        deliveryMode: params.deliveryMode,
        products: params.products,
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
