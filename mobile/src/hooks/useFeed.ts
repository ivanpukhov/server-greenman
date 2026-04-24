import { useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { socialApi } from '@/features/social/api';
import type {
  FeedItem,
  FeedKind,
  FeedPage,
  BookmarkableType,
  ReactableType,
  RepostableType,
} from '@/features/social/types';

export const feedKeys = {
  all: ['social', 'feed'] as const,
  list: (ranking: 'latest' | 'foryou' = 'latest') =>
    [...feedKeys.all, { ranking }] as const,
};

function normalizeItem(raw: any): FeedItem | null {
  if (!raw) return null;
  if (raw.entityId && raw.engagement) {
    const it = raw as FeedItem;
    // Обратная совместимость: старые ответы без reposts/reposted.
    return {
      ...it,
      engagement: {
        likes: it.engagement.likes ?? 0,
        comments: it.engagement.comments ?? 0,
        bookmarks: it.engagement.bookmarks ?? 0,
        reposts: (it.engagement as any).reposts ?? 0,
        views: it.engagement.views,
      },
      me: {
        liked: it.me?.liked ?? false,
        bookmarked: it.me?.bookmarked ?? false,
        reposted: (it.me as any)?.reposted ?? false,
      },
    };
  }
  const d = raw.data ?? raw;
  const kind: FeedKind = raw.kind ?? 'post';
  const entityId = d.id ?? raw.entityId;
  if (!entityId) return null;
  return {
    id: `${kind}-${entityId}`,
    kind,
    entityId,
    publishedAt: raw.publishedAt ?? d.publishedAt ?? null,
    adminUserId: d.adminUserId ?? 0,
    title: d.title ?? null,
    slug: d.slug ?? null,
    excerpt: d.excerpt ?? null,
    text: d.text ?? null,
    description: d.description ?? null,
    cover: d.cover ?? null,
    video: d.video ?? null,
    media: Array.isArray(d.media) ? d.media : [],
    engagement: {
      likes: 0,
      comments: 0,
      bookmarks: 0,
      reposts: 0,
      views: typeof d.viewCount === 'number' ? d.viewCount : undefined,
    },
    me: { liked: false, bookmarked: false, reposted: false },
  } as FeedItem;
}

export { normalizeItem };

export function useInfiniteFeed(ranking: 'latest' | 'foryou' = 'latest') {
  return useInfiniteQuery<FeedPage, Error>({
    queryKey: feedKeys.list(ranking),
    queryFn: async ({ pageParam }) => {
      const data = (await socialApi.feed({
        cursor: pageParam as string | undefined,
        limit: 20,
      })) as FeedPage | FeedItem[] | { items: any[]; nextCursor?: string | null };
      const rawItems: any[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any).items)
          ? (data as any).items
          : [];
      const items = rawItems
        .map(normalizeItem)
        .filter((x): x is FeedItem => !!x);
      const rawNext = Array.isArray(data) ? null : (data as FeedPage).nextCursor ?? null;
      // Guards against infinite loader when the server lags behind the client:
      //  - empty page → no more items
      //  - cursor echoes pageParam → server didn't advance
      const nextCursor =
        items.length > 0 && rawNext && rawNext !== pageParam ? rawNext : null;
      return { items, nextCursor };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

/**
 * Обходит все страницы в кэше feed-а и обновляет конкретный FeedItem.
 */
export function patchFeedItem(
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

export function useToggleRepost() {
  const qc = useQueryClient();
  return useMutation<
    { reposted: boolean; count: number },
    Error,
    { type: RepostableType; id: number }
  >({
    mutationFn: ({ type, id }) => socialApi.reposts.toggle(type, id),
    onMutate: async ({ type, id }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      patchFeedItem(
        qc,
        (it) => it.kind === type && it.entityId === id,
        (it) => {
          const now = !it.me.reposted;
          return {
            ...it,
            me: { ...it.me, reposted: now },
            engagement: {
              ...it.engagement,
              reposts: Math.max(0, it.engagement.reposts + (now ? 1 : -1)),
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
          const rolled = !it.me.reposted;
          return {
            ...it,
            me: { ...it.me, reposted: rolled },
            engagement: {
              ...it.engagement,
              reposts: Math.max(0, it.engagement.reposts + (rolled ? 1 : -1)),
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
          me: { ...it.me, reposted: data.reposted },
          engagement: { ...it.engagement, reposts: data.count },
        })
      );
      qc.invalidateQueries({ queryKey: ['social', 'reposts'] });
    },
  });
}
