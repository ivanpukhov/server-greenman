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

type Enrollment = {
  id: number;
  status: string;
  unlockedUpTo: number;
  course?: {
    slug?: string;
    title?: string;
    durationDays?: number;
    cover?: { url?: string | null } | null;
  };
};

export default function MyCoursesScreen() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['social', 'courses', 'mine'],
    queryFn: async () => {
      const res = await socialApi.courses.mine();
      return (Array.isArray(res) ? res : []) as Enrollment[];
    },
  });

  const items = data ?? [];

  return (
    <Screen>
      <Header title="Мои курсы" />
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
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="school-outline" size={32} color={greenman[7]} />
          <Text className="mt-2 text-sm text-ink-dim">
            У вас пока нет курсов
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                item.course?.slug &&
                router.push(`/social/course/${item.course.slug}`)
              }
              accessibilityRole="button"
              accessibilityLabel={item.course?.title}
              className="mb-3 overflow-hidden rounded-2xl border border-border bg-white active:opacity-80"
            >
              {item.course?.cover?.url ? (
                <Image
                  source={{ uri: item.course.cover.url }}
                  style={{ width: '100%', height: 140 }}
                  contentFit="cover"
                  transition={150}
                />
              ) : null}
              <View className="p-3">
                <Text
                  className="text-base font-semibold text-ink"
                  numberOfLines={2}
                >
                  {item.course?.title ?? 'Курс'}
                </Text>
                <Text className="mt-1 text-xs text-ink-dim">
                  Открыто дней: {item.unlockedUpTo}
                  {item.course?.durationDays ? ` / ${item.course.durationDays}` : ''}
                </Text>
                <Text className="mt-1 text-xs text-ink-dim">
                  Статус: {item.status}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
