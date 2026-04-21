import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import { greenman } from '@/theme/colors';

type Article = {
  id: number;
  slug: string;
  title: string;
  excerpt?: string | null;
  cover?: { url?: string | null } | null;
};

export default function ArticlesListScreen() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['social', 'articles', 'public'],
    queryFn: async () => {
      const res = await socialApi.articles.list();
      return (Array.isArray(res) ? res : []) as Article[];
    },
  });

  const items = data ?? [];

  return (
    <Screen>
      <Header title="Статьи" />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-ink-dim">Загрузка…</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cloud-offline-outline" size={32} color={greenman[7]} />
          <Text className="mt-2 text-sm text-ink-dim">
            Не удалось загрузить статьи
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-3 rounded-full bg-greenman-0 px-4 py-2 active:opacity-70"
          >
            <Text className="text-xs font-semibold text-greenman-8">
              Повторить
            </Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-ink-dim">Пока нет статей</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/social/article/${item.slug}`)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              className="mb-3 overflow-hidden rounded-2xl border border-border bg-white active:opacity-80"
            >
              {item.cover?.url ? (
                <Image
                  source={{ uri: item.cover.url }}
                  style={{ width: '100%', height: 160 }}
                  contentFit="cover"
                  transition={150}
                />
              ) : null}
              <View className="p-3">
                <Text className="text-base font-semibold text-ink" numberOfLines={2}>
                  {item.title}
                </Text>
                {item.excerpt ? (
                  <Text
                    numberOfLines={3}
                    className="mt-1 text-sm text-ink-dim"
                  >
                    {item.excerpt}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
