import { useCallback, useMemo, useRef, useState } from 'react';
import { View, ActivityIndicator, Pressable } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import BlockRenderer from '@/features/social/BlockRenderer';
import { CommentsSheet, type CommentsSheetRef } from '@/components/social/CommentsSheet';
import { ReaderBar } from '@/components/social/ReaderBar';
import { useToggleBookmark, useToggleReaction } from '@/hooks/useFeed';
import { semantic, greenman } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { reading, ui } from '@/theme/typography';
import { formatRelativeRu } from '@/lib/format/relativeTime';

function readingMinutes(blocks: any): number {
  try {
    const arr = typeof blocks === 'string' ? JSON.parse(blocks) : blocks?.blocks ?? blocks;
    if (!Array.isArray(arr)) return 1;
    let words = 0;
    for (const b of arr) {
      const text =
        b?.data?.text || b?.data?.message || b?.data?.caption || b?.data?.code || '';
      words += String(text).trim().split(/\s+/).filter(Boolean).length;
    }
    return Math.max(1, Math.round(words / 180));
  } catch {
    return 1;
  }
}

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const viewportHeight = useSharedValue(1);
  const commentsRef = useRef<CommentsSheetRef>(null);

  const q = useQuery<any, Error>({
    queryKey: ['social', 'articles', 'detail', slug],
    queryFn: () => socialApi.articles.get(slug!),
    enabled: !!slug,
  });

  const data = q.data;

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [bookmarks, setBookmarks] = useState(0);

  // Инициализируем локальное состояние при загрузке данных.
  const initialized = useRef(false);
  if (data && !initialized.current) {
    initialized.current = true;
    setLiked(!!data.me?.liked);
    setBookmarked(!!data.me?.bookmarked);
    setLikes(data.engagement?.likes ?? 0);
    setComments(data.engagement?.comments ?? 0);
    setBookmarks(data.engagement?.bookmarks ?? 0);
  }

  const toggleLike = useToggleReaction();
  const toggleBookmark = useToggleBookmark();

  const onLike = useCallback(() => {
    if (!data) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((n) => Math.max(0, n + (nextLiked ? 1 : -1)));
    toggleLike.mutate(
      { type: 'article', id: data.id },
      {
        onSuccess: (res) => {
          setLiked(res.reacted);
          setLikes(res.count);
        },
        onError: () => {
          setLiked((v) => !v);
          setLikes((n) => Math.max(0, n + (nextLiked ? -1 : 1)));
        },
      }
    );
  }, [data, liked, toggleLike]);

  const onBookmark = useCallback(() => {
    if (!data) return;
    const nextB = !bookmarked;
    setBookmarked(nextB);
    setBookmarks((n) => Math.max(0, n + (nextB ? 1 : -1)));
    toggleBookmark.mutate(
      { type: 'article', id: data.id },
      {
        onSuccess: (res) => {
          setBookmarked(res.bookmarked);
          setBookmarks(res.count);
        },
        onError: () => {
          setBookmarked((v) => !v);
          setBookmarks((n) => Math.max(0, n + (nextB ? -1 : 1)));
        },
      }
    );
  }, [data, bookmarked, toggleBookmark]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
      viewportHeight.value = e.layoutMeasurement.height;
      contentHeight.value = e.contentSize.height;
    },
  });

  const progressStyle = useAnimatedStyle(() => {
    const scrollable = Math.max(1, contentHeight.value - viewportHeight.value);
    const pct = interpolate(scrollY.value, [0, scrollable], [0, 100], Extrapolation.CLAMP);
    return { width: `${pct}%` };
  });

  const minutes = useMemo(() => readingMinutes(data?.blocks), [data?.blocks]);

  if (q.isLoading) {
    return (
      <Screen>
        <Header title="Статья" transparent floating scrollOffset={scrollY} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={semantic.accent} />
        </View>
      </Screen>
    );
  }

  if (q.isError || !data) {
    return (
      <Screen>
        <Header title="Статья" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Ionicons name="cloud-offline-outline" size={40} color={semantic.inkDim} />
          <Text style={[ui.body, { color: semantic.inkDim, marginTop: spacing.sm }]}>
            Не удалось загрузить статью
          </Text>
          <Pressable
            onPress={() => q.refetch()}
            style={{
              marginTop: spacing.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: 10,
              backgroundColor: greenman[7],
              borderRadius: 999,
            }}
          >
            <Text style={{ color: '#fff', fontFamily: 'Manrope_600SemiBold' }}>Повторить</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Header
        title={data.title}
        transparent
        floating
        scrollOffset={scrollY}
      />

      <View
        style={{
          position: 'absolute',
          top: insets.top + 56,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: semantic.border,
          zIndex: 9,
        }}
      >
        <Animated.View
          style={[{ height: '100%', backgroundColor: greenman[7] }, progressStyle]}
        />
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
        showsVerticalScrollIndicator={false}
      >
        {data.cover?.url ? (
          <Image
            source={{ uri: data.cover.url }}
            placeholder={data.cover.blurhash ? { blurhash: data.cover.blurhash } : undefined}
            style={{ width: '100%', aspectRatio: 16 / 10, backgroundColor: semantic.surfaceSunken }}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <View style={{ height: insets.top + 56 }} />
        )}

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Text style={reading.h1}>{data.title}</Text>
          {data.excerpt ? (
            <Text
              style={[reading.bodyLarge, { color: semantic.inkDim, marginTop: spacing.sm }]}
            >
              {data.excerpt}
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              marginTop: spacing.md,
              paddingBottom: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: semantic.border,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: greenman[1],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="leaf" size={18} color={semantic.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ui.label}>Greenman</Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {data.publishedAt ? (
                  <Text style={ui.meta}>{formatRelativeRu(data.publishedAt)}</Text>
                ) : null}
                <Text style={ui.meta}>·</Text>
                <Text style={ui.meta}>{minutes} мин чтения</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ paddingTop: spacing.lg }}>
          <BlockRenderer blocks={data.blocks} options={{ leadParagraph: true }} />
        </View>
      </Animated.ScrollView>

      <ReaderBar
        liked={liked}
        bookmarked={bookmarked}
        likes={likes}
        comments={comments}
        bookmarks={bookmarks}
        onLike={onLike}
        onBookmark={onBookmark}
        onOpenComments={() => commentsRef.current?.present()}
        shareText={data.title}
      />

      <CommentsSheet
        ref={commentsRef}
        type="article"
        id={data.id ?? null}
        onCountChange={setComments}
      />
    </Screen>
  );
}
