import { useMemo } from 'react';
import { FlatList, Pressable, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import { greenman } from '@/theme/colors';

type FeedItem = {
  kind: 'post' | 'reel' | 'article' | 'webinar';
  id: number;
  slug?: string;
  title?: string;
  text?: string;
  excerpt?: string;
  cover?: { url?: string | null } | null;
};

type StoryGroup = {
  adminUserId: number;
  stories?: Array<{ id: number; media?: { url?: string | null } | null }>;
};

const KIND_LABELS: Record<FeedItem['kind'], string> = {
  post: 'Пост',
  reel: 'Reel',
  article: 'Статья',
  webinar: 'Вебинар',
};

export default function FeedScreen() {
  const feedQuery = useQuery({
    queryKey: ['social', 'feed', { limit: 30 }],
    queryFn: async () => {
      const data = await socialApi.feed({ limit: 30 });
      return (Array.isArray(data) ? data : data?.items ?? []) as FeedItem[];
    },
  });

  const storiesQuery = useQuery({
    queryKey: ['social', 'stories', 'active'],
    queryFn: async () => {
      const data = await socialApi.stories.active();
      return (Array.isArray(data) ? data : []) as StoryGroup[];
    },
  });

  const stories = storiesQuery.data ?? [];
  const items = feedQuery.data ?? [];
  const refreshing = feedQuery.isRefetching || storiesQuery.isRefetching;

  const onRefresh = () => {
    feedQuery.refetch();
    storiesQuery.refetch();
  };

  const openItem = (it: FeedItem) => {
    if (it.kind === 'article' && it.slug) router.push(`/social/article/${it.slug}`);
    else if (it.kind === 'webinar' && it.slug) router.push(`/social/webinar/${it.slug}`);
    else if (it.kind === 'reel') router.push('/reels');
    else if (it.kind === 'post') router.push(`/social/post/${it.id}`);
  };

  const Header = useMemo(
    () => (
      <View>
        {stories.length > 0 ? (
          <FlatList
            horizontal
            data={stories}
            keyExtractor={(g) => String(g.adminUserId)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 12 }}
            renderItem={({ item: g }) => {
              const first = g.stories?.[0];
              return (
                <Pressable
                  onPress={() => first?.id && router.push(`/social/story/${first.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel="Открыть сториз"
                  className="items-center active:opacity-70"
                >
                  <View className="h-16 w-16 overflow-hidden rounded-full border-2 border-greenman-6 bg-greenman-0">
                    {first?.media?.url ? (
                      <Image
                        source={{ uri: first.media.url }}
                        style={{ flex: 1 }}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Ionicons name="image-outline" size={22} color={greenman[7]} />
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            }}
          />
        ) : null}

        <View className="flex-row gap-2 px-3 pb-2">
          {(['reels', 'articles', 'courses'] as const).map((k) => {
            const label =
              k === 'reels' ? 'Reels' : k === 'articles' ? 'Статьи' : 'Курсы';
            const go = () =>
              k === 'reels'
                ? router.push('/reels')
                : k === 'articles'
                  ? router.push('/social/articles')
                  : router.push('/social/courses');
            return (
              <Pressable
                key={k}
                onPress={go}
                accessibilityRole="button"
                accessibilityLabel={label}
                className="rounded-full bg-greenman-0 px-4 py-1.5 active:opacity-70"
              >
                <Text className="text-xs font-semibold text-greenman-8">{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    ),
    [stories]
  );

  if (feedQuery.isLoading && !feedQuery.data) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={greenman[7]} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(it) => `${it.kind}-${it.id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={Header}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openItem(item)}
            accessibilityRole="button"
            accessibilityLabel={item.title ?? KIND_LABELS[item.kind]}
            className="border-b border-border px-3 py-3 active:bg-greenman-0"
          >
            <Text className="text-[10px] font-semibold uppercase text-greenman-7">
              {KIND_LABELS[item.kind]}
            </Text>
            {item.title ? (
              <Text className="mt-0.5 text-base font-semibold text-ink">
                {item.title}
              </Text>
            ) : null}
            {item.text ? (
              <Text className="mt-1 text-sm text-ink-dim" numberOfLines={4}>
                {item.text}
              </Text>
            ) : null}
            {item.excerpt ? (
              <Text className="mt-1 text-sm text-ink-dim" numberOfLines={3}>
                {item.excerpt}
              </Text>
            ) : null}
            {item.cover?.url ? (
              <Image
                source={{ uri: item.cover.url }}
                style={{ width: '100%', height: 180, marginTop: 8, borderRadius: 8 }}
                contentFit="cover"
                transition={200}
              />
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          feedQuery.isError ? (
            <View className="p-8 items-center">
              <Ionicons name="cloud-offline-outline" size={32} color={greenman[7]} />
              <Text className="mt-2 text-sm text-ink-dim">
                Не удалось загрузить ленту
              </Text>
              <Pressable
                onPress={onRefresh}
                className="mt-3 rounded-full bg-greenman-0 px-4 py-2 active:opacity-70"
                accessibilityRole="button"
              >
                <Text className="text-xs font-semibold text-greenman-8">
                  Попробовать снова
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="p-8 items-center">
              <Text className="text-sm text-ink-dim">Лента пуста</Text>
            </View>
          )
        }
      />
    </Screen>
  );
}
