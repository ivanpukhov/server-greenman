import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, View, RefreshControl, ActivityIndicator, Share } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import type { FeedItem, FeedKind, RepostableType } from '@/features/social/types';
import { greenman, semantic } from '@/theme/colors';
import { FeedCard } from '@/components/social/FeedCard';
import { FeedStoriesRow, type StoryGroupItem } from '@/components/social/FeedStoriesRow';
import { FeedSkeleton } from '@/components/social/FeedSkeleton';
import {
  useInfiniteFeed,
  useToggleBookmark,
  useToggleReaction,
  useToggleRepost,
  patchFeedItem,
} from '@/hooks/useFeed';
import {
  CommentsSheet,
  type CommentsSheetRef,
  type CommentableType,
} from '@/components/social/CommentsSheet';
import { useAuthStore } from '@/stores/auth.store';

type KindFilter = 'all' | FeedKind;

const FILTERS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'Всё' },
  { key: 'post', label: 'Посты' },
  { key: 'article', label: 'Статьи' },
  { key: 'reel', label: 'Reels' },
  { key: 'webinar', label: 'Вебинары' },
];

const WEB_BASE = 'https://greenman.kz';

function shareLinkFor(it: FeedItem): string {
  switch (it.kind) {
    case 'article':
      return it.slug ? `${WEB_BASE}/articles/${it.slug}` : `${WEB_BASE}/feed`;
    case 'webinar':
      return it.slug ? `${WEB_BASE}/webinars/${it.slug}` : `${WEB_BASE}/feed`;
    case 'reel':
      return `${WEB_BASE}/reels`;
    case 'post':
    default:
      return `${WEB_BASE}/feed`;
  }
}

function shareMessageFor(it: FeedItem): string {
  if (it.title) return it.title;
  if (it.text) return it.text.length > 160 ? `${it.text.slice(0, 157)}…` : it.text;
  if (it.description) return it.description;
  return 'Greenman';
}

export default function FeedScreen() {
  const [filter, setFilter] = useState<KindFilter>('all');
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const feedQuery = useInfiniteFeed('latest');
  const toggleLike = useToggleReaction();
  const toggleBookmark = useToggleBookmark();
  const toggleRepost = useToggleRepost();

  const sheetRef = useRef<CommentsSheetRef>(null);
  const [activeTarget, setActiveTarget] = useState<{
    type: CommentableType;
    id: number;
  } | null>(null);

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
    const seen = new Set<string>();
    const unique: FeedItem[] = [];
    for (const it of flat) {
      const key = it.id ?? `${it.kind}-${it.entityId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(it);
    }
    return filter === 'all' ? unique : unique.filter((it) => it.kind === filter);
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

  const requireAuth = useCallback((): boolean => {
    if (!isAuthed) {
      router.push('/auth/phone');
      return false;
    }
    return true;
  }, [isAuthed]);

  const onLike = useCallback(
    (it: FeedItem) => {
      if (it.kind === 'course' || it.kind === 'story') return;
      if (!requireAuth()) return;
      toggleLike.mutate({ type: it.kind, id: it.entityId });
    },
    [toggleLike, requireAuth]
  );

  const onBookmark = useCallback(
    (it: FeedItem) => {
      if (it.kind === 'story') return;
      if (!requireAuth()) return;
      toggleBookmark.mutate({ type: it.kind, id: it.entityId });
    },
    [toggleBookmark, requireAuth]
  );

  const onRepost = useCallback(
    (it: FeedItem) => {
      if (it.kind === 'course' || it.kind === 'story') return;
      if (!requireAuth()) return;
      toggleRepost.mutate({ type: it.kind as RepostableType, id: it.entityId });
    },
    [toggleRepost, requireAuth]
  );

  const onShare = useCallback(async (it: FeedItem) => {
    const url = shareLinkFor(it);
    const message = shareMessageFor(it);
    try {
      await Share.share({ url, message: `${message}\n${url}` });
    } catch {
      // игнорируем отмену/ошибку — native share sheet
    }
  }, []);

  const onComment = useCallback((it: FeedItem) => {
    if (it.kind === 'course' || it.kind === 'story') return;
    setActiveTarget({ type: it.kind as CommentableType, id: it.entityId });
    sheetRef.current?.present();
  }, []);

  const onCommentCountChange = useCallback(
    (count: number) => {
      if (!activeTarget) return;
      patchFeedItem(
        qc,
        (it) => it.kind === activeTarget.type && it.entityId === activeTarget.id,
        (it) => ({
          ...it,
          engagement: { ...it.engagement, comments: count },
        })
      );
    },
    [activeTarget, qc]
  );

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
          keyExtractor={(it) => it.id ?? `${it.kind}-${it.entityId}`}
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
              onRepost={() => onRepost(item)}
              onShare={() => onShare(item)}
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
      <CommentsSheet
        ref={sheetRef}
        type={activeTarget?.type ?? 'post'}
        id={activeTarget?.id ?? null}
        onCountChange={onCommentCountChange}
      />
    </Screen>
  );
}
