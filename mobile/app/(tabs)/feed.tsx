import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import type { FeedItem, FeedKind } from '@/features/social/types';
import { greenman, semantic } from '@/theme/colors';
import { FeedCard } from '@/components/social/FeedCard';
import { FeedStoriesRow, type StoryGroupItem } from '@/components/social/FeedStoriesRow';
import { FeedSkeleton } from '@/components/social/FeedSkeleton';
import { useInfiniteFeed, useToggleBookmark, useToggleReaction } from '@/hooks/useFeed';

type KindFilter = 'all' | FeedKind;

const FILTERS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'Всё' },
  { key: 'post', label: 'Посты' },
  { key: 'article', label: 'Статьи' },
  { key: 'reel', label: 'Reels' },
  { key: 'webinar', label: 'Вебинары' },
];

export default function FeedScreen() {
  const [filter, setFilter] = useState<KindFilter>('all');

  const feedQuery = useInfiniteFeed('latest');
  const toggleLike = useToggleReaction();
  const toggleBookmark = useToggleBookmark();

  const storiesQuery = useQuery({
    queryKey: ['social', 'stories', 'active'],
    queryFn: async () => {
      const data = await socialApi.stories.active();
      return (Array.isArray(data) ? data : []) as StoryGroupItem[];
    },
  });

  const stories = storiesQuery.data ?? [];
  const items = useMemo<FeedItem[]>(() => {
    const flat = feedQuery.data?.pages.flatMap((p) => p.items) ?? [];
    return filter === 'all' ? flat : flat.filter((it) => it.kind === filter);
  }, [feedQuery.data, filter]);

  const refreshing = feedQuery.isRefetching || storiesQuery.isRefetching;

  const onRefresh = useCallback(() => {
    feedQuery.refetch();
    storiesQuery.refetch();
  }, [feedQuery, storiesQuery]);

  const onEndReached = useCallback(() => {
    if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
      feedQuery.fetchNextPage();
    }
  }, [feedQuery]);

  const openItem = useCallback((it: FeedItem) => {
    if (it.kind === 'article' && it.slug) router.push(`/social/article/${it.slug}`);
    else if (it.kind === 'webinar' && it.slug) router.push(`/social/webinar/${it.slug}`);
    else if (it.kind === 'reel') router.push('/reels');
    else if (it.kind === 'post') router.push(`/social/post/${it.entityId}`);
  }, []);

  const onLike = useCallback(
    (it: FeedItem) => {
      if (it.kind === 'course' || it.kind === 'story') return;
      toggleLike.mutate({ type: it.kind, id: it.entityId });
    },
    [toggleLike]
  );

  const onBookmark = useCallback(
    (it: FeedItem) => {
      if (it.kind === 'story') return;
      toggleBookmark.mutate({ type: it.kind, id: it.entityId });
    },
    [toggleBookmark]
  );

  const onComment = useCallback((it: FeedItem) => openItem(it), [openItem]);

  const Header = useMemo(
    () => (
      <View>
        <View className="flex-row items-center justify-between px-md pb-xs pt-xs">
          <Text className="text-h3 font-bold text-ink" style={{ fontFamily: 'Hagrid_700Bold' }}>
            Лента
          </Text>
          <Pressable
            onPress={() => router.push('/social/search')}
            accessibilityRole="button"
            accessibilityLabel="Поиск"
            hitSlop={10}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface-sunken active:opacity-80"
          >
            <Ionicons name="search" size={20} color={semantic.ink} />
          </Pressable>
        </View>
        <FeedStoriesRow groups={stories} />
        <View className="flex-row flex-wrap gap-xs px-sm pb-sm pt-xs">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                accessibilityLabel={f.label}
                className={`rounded-full px-md py-1.5 active:opacity-80 ${
                  active ? 'bg-greenman-7' : 'bg-surface-muted'
                }`}
              >
                <Text
                  className={`text-caption font-semibold ${
                    active ? 'text-white' : 'text-greenman-8'
                  }`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    ),
    [stories, filter]
  );

  const isLoading = feedQuery.isLoading && !feedQuery.data;

  return (
    <Screen>
      {isLoading ? (
        <FeedSkeleton />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={greenman[7]} />
          }
          ListHeaderComponent={Header}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          windowSize={5}
          removeClippedSubviews
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <FeedCard
              item={item}
              onPress={() => openItem(item)}
              onLike={() => onLike(item)}
              onComment={() => onComment(item)}
              onBookmark={() => onBookmark(item)}
            />
          )}
          ListFooterComponent={
            feedQuery.isFetchingNextPage ? (
              <View className="py-lg items-center">
                <ActivityIndicator color={semantic.accent} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            feedQuery.isError ? (
              <View className="px-8 py-16 items-center">
                <Ionicons name="cloud-offline-outline" size={40} color={greenman[7]} />
                <Text className="mt-sm text-label text-ink-dim">Не удалось загрузить ленту</Text>
                <Pressable
                  onPress={onRefresh}
                  accessibilityRole="button"
                  className="mt-md rounded-full bg-greenman-7 px-lg py-2.5 active:opacity-80"
                >
                  <Text className="text-caption font-semibold text-white">Обновить</Text>
                </Pressable>
              </View>
            ) : (
              <View className="px-8 py-16 items-center">
                <Ionicons name="sparkles-outline" size={40} color={greenman[7]} />
                <Text className="mt-sm text-label text-ink-dim">
                  {filter === 'all' ? 'Пока пусто' : 'Ничего не найдено'}
                </Text>
                {filter !== 'all' ? (
                  <Pressable
                    onPress={() => setFilter('all')}
                    accessibilityRole="button"
                    className="mt-sm rounded-full bg-surface-muted px-md py-xs active:opacity-80"
                  >
                    <Text className="text-caption font-semibold text-greenman-8">Показать всё</Text>
                  </Pressable>
                ) : null}
              </View>
            )
          }
        />
      )}
    </Screen>
  );
}
