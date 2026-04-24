import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, View, RefreshControl, ActivityIndicator, Share } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/IconButton';
import { socialApi } from '@/features/social/api';
import type { FeedItem, FeedKind, RepostableType } from '@/features/social/types';
import { ink, sand } from '@/theme/colors';
import { FeedCard } from '@/components/social/FeedCard';
import { FeedStoriesRow, type StoryGroupItem } from '@/components/social/FeedStoriesRow';
import { FeedSkeleton } from '@/components/social/FeedSkeleton';
import { FeedHighlight } from '@/components/social/FeedHighlight';
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
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

type KindFilter = 'all' | FeedKind;

const FILTERS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'Всё' },
  { key: 'post', label: 'Посты' },
  { key: 'article', label: 'Статьи' },
  { key: 'reel', label: 'Reels' },
  { key: 'webinar', label: 'Вебинары' },
];

const HIGHLIGHT_EVERY = 6;
const HIGHLIGHT_VARIANTS = ['courses', 'newsletter', 'community'] as const;

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

type Row =
  | { type: 'feed'; item: FeedItem; key: string }
  | { type: 'highlight'; variant: (typeof HIGHLIGHT_VARIANTS)[number]; key: string };

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

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    items.forEach((it, idx) => {
      const key = it.id ?? `${it.kind}-${it.entityId}`;
      out.push({ type: 'feed', item: it, key });
      const position = idx + 1;
      if (filter === 'all' && position % HIGHLIGHT_EVERY === 0) {
        const v = HIGHLIGHT_VARIANTS[Math.floor(position / HIGHLIGHT_EVERY) % HIGHLIGHT_VARIANTS.length];
        out.push({ type: 'highlight', variant: v, key: `hl-${position}-${v}` });
      }
    });
    return out;
  }, [items, filter]);

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
      // ignore
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

  const openHighlight = useCallback((variant: (typeof HIGHLIGHT_VARIANTS)[number]) => {
    if (variant === 'courses') router.push('/social/my-courses');
    else if (variant === 'newsletter') router.push('/social/search');
    else router.push('/social/search');
  }, []);

  const Header = useMemo(
    () => (
      <View>
        <View className="px-5 pb-2 pt-3">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text variant="meta-upper" tracking="widest" className="text-ink/50">
                Что нового
              </Text>
              <Text
                variant="display-serif"
                className="mt-1 text-ink"
                style={{ fontSize: 34, lineHeight: 38 }}
              >
                Лента
              </Text>
            </View>
            <IconButton
              icon={<Ionicons name="search" size={20} color={ink.DEFAULT} />}
              tone="sand"
              size="md"
              onPress={() => router.push('/social/search')}
              accessibilityLabel="Поиск"
            />
          </View>
        </View>

        <FeedStoriesRow groups={stories} />

        <View className="flex-row gap-2 px-5 pb-4 pt-1">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <AnimatedPressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                haptic="selection"
                scale={0.94}
                accessibilityRole="button"
                accessibilityLabel={f.label}
              >
                <View
                  className={`h-9 items-center justify-center rounded-pill px-4 ${
                    active ? 'bg-ink' : 'bg-sand-1'
                  }`}
                >
                  <Text
                    className={`text-[12px] font-bold ${active ? 'text-white' : 'text-ink/60'}`}
                    tracking="tight"
                  >
                    {f.label}
                  </Text>
                </View>
              </AnimatedPressable>
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
          data={rows}
          keyExtractor={(r) => r.key}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ink.DEFAULT} />
          }
          ListHeaderComponent={Header}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          windowSize={5}
          removeClippedSubviews
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => {
            if (item.type === 'highlight') {
              return <FeedHighlight variant={item.variant} onPress={() => openHighlight(item.variant)} />;
            }
            const it = item.item;
            return (
              <FeedCard
                item={it}
                onPress={() => openItem(it)}
                onLike={() => onLike(it)}
                onComment={() => onComment(it)}
                onBookmark={() => onBookmark(it)}
                onRepost={() => onRepost(it)}
                onShare={() => onShare(it)}
              />
            );
          }}
          ListFooterComponent={
            feedQuery.isFetchingNextPage ? (
              <View className="items-center py-8">
                <ActivityIndicator color={ink.DEFAULT} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            feedQuery.isError ? (
              <View className="items-center px-8 py-16">
                <Ionicons name="cloud-offline-outline" size={40} color={sand[3]} />
                <Text className="mt-4 text-ink/60">Не удалось загрузить ленту</Text>
                <AnimatedPressable onPress={onRefresh} haptic="light" scale={0.96}>
                  <View className="mt-4 rounded-pill bg-ink px-6 py-3">
                    <Text className="text-[13px] font-bold text-white" tracking="tight">
                      Обновить
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            ) : (
              <View className="items-center px-8 py-16">
                <Ionicons name="sparkles-outline" size={40} color={sand[3]} />
                <Text className="mt-4 text-ink/60">
                  {filter === 'all' ? 'Пока пусто' : 'Ничего не найдено'}
                </Text>
                {filter !== 'all' ? (
                  <AnimatedPressable onPress={() => setFilter('all')} haptic="selection" scale={0.96}>
                    <View className="mt-3 rounded-pill bg-sand-1 px-5 py-2.5">
                      <Text className="text-[12px] font-bold text-ink" tracking="tight">
                        Показать всё
                      </Text>
                    </View>
                  </AnimatedPressable>
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
