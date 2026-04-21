import { useState } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { AdminListItem } from '@/components/admin/AdminListItem';
import { useAdminProducts } from '@/hooks/admin/useAdminProducts';
import { greenman } from '@/theme/colors';

export default function AdminProductsIndex() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useAdminProducts();
  const [query, setQuery] = useState('');

  const filtered = (data ?? []).filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q);
  });

  return (
    <Screen>
      <Header title="Товары" />
      <View className="border-b border-border bg-white p-3">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск по названию"
          leftIcon={<Ionicons name="search" size={18} color={greenman[7]} />}
        />
      </View>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={greenman[7]} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 8 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text className="py-8 text-center text-sm text-ink-dim">
              {query ? 'Ничего не найдено.' : 'Товаров нет.'}
            </Text>
          }
          renderItem={({ item }) => (
            <AdminListItem
              title={item.name}
              subtitle={
                item.alias
                  ? `${item.alias} · ${item.types.length} тип.`
                  : `${item.types.length} тип.`
              }
              onPress={() => router.push(`/admin/products/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}
