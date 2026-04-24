import { useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { socialApi } from '@/features/social/api';
import type {
  FeedItem,
  FeedPage,
  BookmarkableType,
  ReactableType,
} from '@/features/social/types';

export const feedKeys = {
  all: ['social', 'feed'] as const,
  list: (ranking: 'latest' | 'foryou' = 'latest') =>
    [...feedKeys.all, { ranking }] as const,
};

export function useInfiniteFeed(ranking: 'latest' | 'foryou' = 'latest') {
  return useInfiniteQuery<FeedPage, Error>({
    queryKey: feedKeys.list(ranking),
    queryFn: async ({ pageParam }) => {
      const data = (await socialApi.feed({
        cursor: pageParam as string | undefined,
        limit: 20,
      })) as FeedPage | FeedItem[] | { items: FeedItem[] };
      // Обратная совместимость: если вернули массив — оборачиваем
      if (Array.isArray(data)) {
        return { items: data, nextCursor: null };
      }
      if ('items' in data && Array.isArray(data.items)) {
        return {
          items: data.items,
          nextCursor: (data as FeedPage).nextCursor ?? null,
        };
      }
      return { items: [], nextCursor: null };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

/**
 * Обходит все страницы в кэше feed-а и обновляет конкретный FeedItem.
 */
function patchFeedItem(
  qc: ReturnType<typeof useQueryClient>,
  match: (item: FeedItem) => boolean,
  patch: (item: FeedItem) => FeedItem
) {
  const caches = qc.getQueriesData<{ pages: FeedPage[]; pageParams: unknown[] }>({
    queryKey: feedKeys.all,
  });
  for (const [key, data] of caches) {
    if (!data) continue;
    const next = {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((it) => (match(it) ? patch(it) : it)),
      })),
    };
    qc.setQueryData(key, next);
  }
}

export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation<
    { reacted: boolean; count: number },
    Error,
    { type: ReactableType; id: number }
  >({
    mutationFn: ({ type, id }) => socialApi.reactions.toggle(type, id, 'like'),
    onMutate: async ({ type, id }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      patchFeedItem(
        qc,
        (it) => it.kind === type && it.entityId === id,
        (it) => {
          const nowLiked = !it.me.liked;
          return {
            ...it,
            me: { ...it.me, liked: nowLiked },
            engagement: {
              ...it.engagement,
              likes: Math.max(0, it.engagement.likes + (nowLiked ? 1 : -1)),
            },
          };
        }
      );
    },
    onError: (_err, { type, id }) => {
      // откатываем оптимистичное обновление
      patchFeedItem(
        qc,
        (it) => it.kind === type && it.entityId === id,
        (it) => {
          const rolledLiked = !it.me.liked;
          return {
            ...it,
            me: { ...it.me, liked: rolledLiked },
            engagement: {
              ...it.engagement,
              likes: Math.max(0, it.engagement.likes + (rolledLiked ? 1 : -1)),
            },
          };
        }
      );
    },
    onSuccess: (data, { type, id }) => {
      patchFeedItem(
        qc,
        (it) => it.kind === type && it.entityId === id,
        (it) => ({
          ...it,
          me: { ...it.me, liked: data.reacted },
          engagement: { ...it.engagement, likes: data.count },
        })
      );
    },
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation<
    { bookmarked: boolean; count: number },
    Error,
    { type: BookmarkableType; id: number }
  >({
    mutationFn: ({ type, id }) => socialApi.bookmarks.toggle(type, id),
    onMutate: async ({ type, id }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      patchFeedItem(
        qc,
        (it) => it.kind === type && it.entityId === id,
        (it) => {
          const now = !it.me.bookmarked;
          return {
            ...it,
            me: { ...it.me, bookmarked: now },
            engagement: {
              ...it.engagement,
              bookmarks: Math.max(0, it.engagement.bookmarks + (now ? 1 : -1)),
            },
          };
        }
      );
    },
    onError: (_err, { type, id }) => {
      patchFeedItem(
        qc,
        (it) => it.kind === type && it.entityId === id,
        (it) => {
          const rolled = !it.me.bookmarked;
          return {
            ...it,
            me: { ...it.me, bookmarked: rolled },
            engagement: {
              ...it.engagement,
              bookmarks: Math.max(0, it.engagement.bookmarks + (rolled ? 1 : -1)),
            },
          };
        }
      );
    },
    onSuccess: (data, { type, id }) => {
      patchFeedItem(
        qc,
        (it) => it.kind === type && it.entityId === id,
        (it) => ({
          ...it,
          me: { ...it.me, bookmarked: data.bookmarked },
          engagement: { ...it.engagement, bookmarks: data.count },
        })
      );
      qc.invalidateQueries({ queryKey: ['social', 'bookmarks'] });
    },
  });
}
