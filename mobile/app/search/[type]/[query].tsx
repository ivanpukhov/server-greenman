import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Header } from '@/components/ui/Header';
import { ProductGrid, ProductGridSkeleton } from '@/components/product/ProductGrid';
import { useSearchProducts, type SearchType } from '@/hooks/useProducts';

export default function SearchResults() {
  const { type, query } = useLocalSearchParams<{ type: SearchType; query: string }>();
  const decoded = decodeURIComponent(query ?? '');
  const searchType: SearchType = type === 'disease' ? 'disease' : 'name';
  const { data, isLoading, isError } = useSearchProducts(searchType, decoded);

  const results = data ?? [];
  const title = searchType === 'disease' ? 'Поиск по болезни' : 'Поиск по названию';

  return (
    <Screen>
      <Header title={title} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text className="text-sm text-ink-dim">Запрос</Text>
        <Text className="mt-1 text-xl font-display text-ink">«{decoded}»</Text>

        <View className="mt-5">
          {isLoading ? (
            <ProductGridSkeleton rows={3} />
          ) : isError ? (
            <Text className="text-sm text-ink-dim">Ошибка поиска. Попробуйте позже.</Text>
          ) : results.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-base font-semibold text-ink">Ничего не найдено</Text>
              <Text className="mt-1 text-sm text-ink-dim">Попробуйте другой запрос.</Text>
            </View>
          ) : (
            <ProductGrid products={results} />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
