import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import { greenman } from '@/theme/colors';

type Course = {
  id: number;
  slug: string;
  title: string;
  shortDescription?: string | null;
  cover?: { url?: string | null } | null;
  priceCents: number;
  currency: string;
  durationDays: number;
};

export default function CoursesListScreen() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['social', 'courses', 'public'],
    queryFn: async () => {
      const res = await socialApi.courses.list();
      return (Array.isArray(res) ? res : []) as Course[];
    },
  });

  const items = data ?? [];

  return (
    <Screen>
      <Header
        title="Курсы"
        rightAction={
          <IconButton
            icon={<Ionicons name="bookmark-outline" size={20} color={greenman[7]} />}
            onPress={() => router.push('/social/my-courses')}
            accessibilityLabel="Мои курсы"
          />
        }
      />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-ink-dim">Загрузка…</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cloud-offline-outline" size={32} color={greenman[7]} />
          <Text className="mt-2 text-sm text-ink-dim">
            Не удалось загрузить курсы
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
          <Text className="text-sm text-ink-dim">Пока нет курсов</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const price =
              item.priceCents > 0
                ? `${(item.priceCents / 100).toLocaleString('ru-RU')} ${item.currency || '₸'}`
                : 'Бесплатно';
            return (
              <Pressable
                onPress={() => router.push(`/social/course/${item.slug}`)}
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
                  {item.shortDescription ? (
                    <Text numberOfLines={2} className="mt-1 text-sm text-ink-dim">
                      {item.shortDescription}
                    </Text>
                  ) : null}
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="text-base font-bold text-greenman-8">
                      {price}
                    </Text>
                    <Text className="text-xs text-ink-dim">
                      {item.durationDays} дн.
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
