import { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { FloatingCartButton } from '@/components/ui/FloatingCartButton';
import { ProductGrid, ProductGridSkeleton } from '@/components/product/ProductGrid';
import { EmptyState } from '@/components/common/EmptyState';
import { useProducts } from '@/hooks/useProducts';
import { greenman } from '@/theme/colors';

export default function CatalogScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isRefetching } = useProducts();
  const [query, setQuery] = useState('');
  const [activeDisease, setActiveDisease] = useState<string | null>(null);

  const topDiseases = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of data ?? []) {
      for (const d of p.diseases ?? []) {
        if (!d) continue;
        const key = d.trim();
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
  }, [data]);

  const filtered = useMemo(() => {
    const products = data ?? [];
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (activeDisease) {
        const diseases = (p.diseases ?? []).map((d) => d.toLowerCase());
        if (!diseases.includes(activeDisease.toLowerCase())) return false;
      }
      if (!q) return true;
      const name = p.name?.toLowerCase() ?? '';
      const desc = p.description?.toLowerCase() ?? '';
      return name.includes(q) || desc.includes(q);
    });
  }, [data, query, activeDisease]);

  return (
    <Screen>
      <View className="border-b border-border bg-white px-5 pb-3 pt-4">
        <Text className="text-xl font-display text-ink">{t('catalog.title')}</Text>

        <View className="mt-2">
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={t('header.search_placeholder_name')}
            leftIcon={<Ionicons name="search" size={18} color={greenman[7]} />}
            returnKeyType="search"
          />
        </View>

        {topDiseases.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 10, gap: 8 }}
          >
            <Chip
              label={t('catalog.all')}
              selected={!activeDisease}
              onPress={() => setActiveDisease(null)}
            />
            {topDiseases.map((d) => (
              <Chip
                key={d}
                label={d}
                selected={activeDisease === d}
                onPress={() => setActiveDisease(activeDisease === d ? null : d)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={greenman[7]} />}
        removeClippedSubviews
      >
        {isLoading ? (
          <ProductGridSkeleton rows={3} />
        ) : isError ? (
          <EmptyState
            variant="error"
            title={t('common.error')}
            subtitle="Проверьте соединение и попробуйте снова."
            actionLabel={t('common.retry')}
            onAction={() => refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t('catalog.empty_title')}
            subtitle={t('catalog.empty_text')}
          />
        ) : (
          <ProductGrid products={filtered} />
        )}
      </ScrollView>

      <FloatingCartButton />
    </Screen>
  );
}
