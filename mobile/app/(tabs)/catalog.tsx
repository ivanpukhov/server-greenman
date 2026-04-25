import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FloatingCartButton } from '@/components/ui/FloatingCartButton';
import { ProductGrid, ProductGridSkeleton } from '@/components/product/ProductGrid';
import { EmptyState } from '@/components/common/EmptyState';
import { useProducts } from '@/hooks/useProducts';
import { greenman, ink } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import type { Product } from '@/lib/api/types';

type SortKey = 'popular' | 'cheap' | 'expensive' | 'new' | 'rating';

const SORT_LABELS: Record<SortKey, string> = {
  popular: 'По популярности',
  cheap: 'Сначала дешёвые',
  expensive: 'Сначала дорогие',
  new: 'Новые',
  rating: 'По рейтингу',
};

function minPrice(product: Product) {
  const types = product.types ?? [];
  if (!types.length) return Number.POSITIVE_INFINITY;
  return Math.min(...types.map((type) => type.price));
}

export default function CatalogScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useProducts();
  const [query, setQuery] = useState('');
  const [activeDiseases, setActiveDiseases] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>('popular');
  const [discountOnly, setDiscountOnly] = useState(false);
  const [stockOnly, setStockOnly] = useState(false);
  const filtersRef = useRef<BottomSheetModal>(null);
  const sortRef = useRef<BottomSheetModal>(null);

  const products = data ?? [];
  const topDiseases = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      for (const disease of product.diseases ?? []) {
        const key = disease.trim();
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([name]) => name);
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selected = activeDiseases.map((disease) => disease.toLowerCase());
    const out = products.filter((product) => {
      if (selected.length) {
        const diseases = (product.diseases ?? []).map((disease) => disease.toLowerCase());
        if (!selected.some((disease) => diseases.includes(disease))) return false;
      }
      if (stockOnly && !(product.types ?? []).some((type) => (type.stockQuantity ?? 1) > 0)) return false;
      if (discountOnly) return false;
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        String(product.description ?? '').toLowerCase().includes(q) ||
        (product.diseases ?? []).some((disease) => disease.toLowerCase().includes(q))
      );
    });

    return out.sort((a, b) => {
      if (sort === 'cheap') return minPrice(a) - minPrice(b);
      if (sort === 'expensive') return minPrice(b) - minPrice(a);
      if (sort === 'rating') return (b.rating?.average ?? 0) - (a.rating?.average ?? 0);
      if (sort === 'new') return b.id - a.id;
      return (b.rating?.count ?? 0) - (a.rating?.count ?? 0);
    });
  }, [activeDiseases, discountOnly, products, query, sort, stockOnly]);

  const toggleDisease = useCallback((disease: string) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveDiseases((current) =>
      current.includes(disease)
        ? current.filter((item) => item !== disease)
        : [...current, disease],
    );
  }, []);

  const resetFilters = () => {
    setActiveDiseases([]);
    setDiscountOnly(false);
    setStockOnly(false);
  };

  const activeFilterCount = activeDiseases.length + (discountOnly ? 1 : 0) + (stockOnly ? 1 : 0);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View className="border-b border-border bg-white px-4 pb-3 pt-3">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="font-display text-[28px] leading-[34px] text-ink">Каталог</Text>
            <Text className="mt-0.5 text-[13px] font-medium text-ink/60">
              {products.length} товаров
            </Text>
          </View>
          <AnimatedPressable
            onPress={() => filtersRef.current?.present()}
            haptic="selection"
            scale={0.94}
            className="h-11 w-11 items-center justify-center rounded-full bg-greenman-0"
            accessibilityRole="button"
            accessibilityLabel="Фильтры"
          >
            <Ionicons name="options-outline" size={21} color={greenman[7]} />
            {activeFilterCount ? (
              <View className="absolute -right-0.5 -top-0.5 min-w-5 items-center rounded-pill bg-sun-2 px-1">
                <Text className="text-[10px] font-bold text-ink">{activeFilterCount}</Text>
              </View>
            ) : null}
          </AnimatedPressable>
        </View>

        <View className="mt-3">
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Найти траву или болезнь"
            leftIcon={<Ionicons name="search" size={20} color={ink[60]} />}
            rightIcon={query ? <Ionicons name="close-circle" size={18} color={ink[40]} /> : undefined}
            onRightIconPress={() => setQuery('')}
            returnKeyType="search"
          />
        </View>
      </View>

      <View className="bg-background">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
        >
          <Chip label="Все" selected={!activeDiseases.length} onPress={() => setActiveDiseases([])} tone="primary" />
          {topDiseases.map((disease) => (
            <Chip
              key={disease}
              label={disease}
              selected={activeDiseases.includes(disease)}
              onPress={() => toggleDisease(disease)}
              tone="primary"
            />
          ))}
        </ScrollView>

        <View className="h-11 flex-row items-center justify-between px-4">
          <AnimatedPressable
            onPress={() => sortRef.current?.present()}
            haptic="selection"
            scale={0.97}
            className="h-9 flex-row items-center rounded-pill bg-sand-1 px-4"
          >
            <Text className="text-[13px] font-semibold text-ink">{SORT_LABELS[sort]}</Text>
            <Ionicons name="chevron-down" size={14} color={ink[60]} style={{ marginLeft: 6 }} />
          </AnimatedPressable>

          <View className="h-9 flex-row items-center rounded-pill bg-sand-1 p-1">
            <View className="h-7 w-8 items-center justify-center rounded-pill bg-white" style={shadows.flat}>
              <Ionicons name="grid-outline" size={16} color={greenman[7]} />
            </View>
            <View className="h-7 w-8 items-center justify-center">
              <Ionicons name="list-outline" size={17} color={ink[40]} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 136 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={greenman[7]} />}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ProductGridSkeleton rows={4} />
        ) : isError ? (
          <EmptyState
            variant="error"
            title="Не удалось загрузить"
            subtitle="Проверьте соединение и попробуйте снова."
            actionLabel="Повторить"
            onAction={() => refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? `По запросу «${query}» ничего нет` : 'Ничего не нашли'}
            subtitle="Сбросьте фильтры или напишите травнику в WhatsApp."
            actionLabel="Сбросить фильтры"
            onAction={resetFilters}
          />
        ) : (
          <ProductGrid products={filtered} />
        )}
      </ScrollView>

      <FloatingCartButton />

      <Sheet ref={sortRef} title="Сортировка" snapPoints={['42%']}>
        <View className="gap-2">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <SheetRow
              key={key}
              label={SORT_LABELS[key]}
              selected={sort === key}
              onPress={() => {
                setSort(key);
                sortRef.current?.dismiss();
              }}
            />
          ))}
        </View>
      </Sheet>

      <Sheet ref={filtersRef} title="Фильтры" subtitle="Уточните каталог" snapPoints={['88%']} scrollable>
        <View className="mb-4 flex-row justify-end">
          <Button label="Сбросить" variant="ghost" size="sm" onPress={resetFilters} />
        </View>
        <Text className="mb-3 text-[13px] font-semibold text-ink/60">Заболевания</Text>
        <View className="flex-row flex-wrap gap-2">
          {topDiseases.map((disease) => (
            <Chip
              key={disease}
              label={disease}
              selected={activeDiseases.includes(disease)}
              onPress={() => toggleDisease(disease)}
              tone="primary"
            />
          ))}
        </View>
        <View className="mt-6 gap-2">
          <ToggleRow label="Только в наличии" active={stockOnly} onPress={() => setStockOnly((v) => !v)} />
          <ToggleRow label="Только со скидкой" active={discountOnly} onPress={() => setDiscountOnly((v) => !v)} disabled />
        </View>
        <Button
          label={`Показать ${filtered.length} товаров`}
          size="lg"
          full
          className="mt-6"
          onPress={() => filtersRef.current?.dismiss()}
        />
      </Sheet>
    </Screen>
  );
}

function SheetRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="selection"
      className={`h-14 flex-row items-center rounded-md px-4 ${selected ? 'bg-greenman-0' : 'bg-white'}`}
    >
      <Text className="flex-1 text-[15px] font-semibold text-ink">{label}</Text>
      {selected ? <Ionicons name="checkmark-circle" size={20} color={greenman[7]} /> : null}
    </AnimatedPressable>
  );
}

function ToggleRow({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      className={`h-14 flex-row items-center rounded-md bg-sand-1 px-4 ${disabled ? 'opacity-40' : ''}`}
    >
      <Text className="flex-1 text-[15px] font-semibold text-ink">{label}</Text>
      <View className={`h-7 w-12 rounded-pill p-1 ${active ? 'bg-greenman-7' : 'bg-ink/10'}`}>
        <View className={`h-5 w-5 rounded-full bg-white ${active ? 'ml-5' : ''}`} />
      </View>
    </AnimatedPressable>
  );
}
