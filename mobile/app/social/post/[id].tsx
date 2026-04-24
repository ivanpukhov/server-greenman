import { useCallback, useRef, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import { CommentsSheet, type CommentsSheetRef } from '@/components/social/CommentsSheet';
import { ReaderBar } from '@/components/social/ReaderBar';
import { useToggleBookmark, useToggleReaction } from '@/hooks/useFeed';
import { semantic, greenman } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { ui } from '@/theme/typography';
import { formatRelativeRu } from '@/lib/format/relativeTime';

const SCREEN_W = Dimensions.get('window').width;

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commentsRef = useRef<CommentsSheetRef>(null);

  const q = useQuery<any, Error>({
    queryKey: ['social', 'posts', 'detail', id],
    queryFn: () => socialApi.posts.get(parseInt(String(id), 10)),
    enabled: !!id,
  });

  const data = q.data;

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [bookmarks, setBookmarks] = useState(0);
  const [activeMedia, setActiveMedia] = useState(0);

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
      { type: 'post', id: data.id },
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
    const next = !bookmarked;
    setBookmarked(next);
    setBookmarks((n) => Math.max(0, n + (next ? 1 : -1)));
    toggleBookmark.mutate(
      { type: 'post', id: data.id },
      {
        onSuccess: (res) => {
          setBookmarked(res.bookmarked);
          setBookmarks(res.count);
        },
        onError: () => {
          setBookmarked((v) => !v);
          setBookmarks((n) => Math.max(0, n + (next ? -1 : 1)));
        },
      }
    );
  }, [data, bookmarked, toggleBookmark]);

  if (q.isLoading) {
    return (
      <Screen>
        <Header title="Пост" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={semantic.accent} />
        </View>
      </Screen>
    );
  }

  if (q.isError || !data) {
    return (
      <Screen>
        <Header title="Пост" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Ionicons name="cloud-offline-outline" size={40} color={semantic.inkDim} />
          <Text style={[ui.body, { color: semantic.inkDim, marginTop: spacing.sm }]}>
            Не удалось загрузить пост
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

  const media: any[] = Array.isArray(data.media)
    ? data.media.filter((m: any) => m?.type === 'image' && m?.url)
    : [];

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Пост" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: greenman[1],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="leaf" size={20} color={semantic.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ui.label}>Greenman</Text>
            {data.publishedAt ? (
              <Text style={ui.meta}>{formatRelativeRu(data.publishedAt)}</Text>
            ) : null}
          </View>
        </View>

        {media.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                setActiveMedia(idx);
              }}
            >
              {media.map((m, i) => (
                <View key={m.id ?? i} style={{ width: SCREEN_W, height: SCREEN_W, backgroundColor: '#000' }}>
                  <Image
                    source={{ uri: m.url }}
                    placeholder={m.blurhash ? { blurhash: m.blurhash } : undefined}
                    style={{ flex: 1 }}
                    contentFit="cover"
                    transition={200}
                  />
                </View>
              ))}
            </ScrollView>
            {media.length > 1 ? (
              <View
                style={{
                  position: 'absolute',
                  top: spacing.sm,
                  right: spacing.sm,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: '#fff', fontFamily: 'Manrope_600SemiBold', fontSize: 12 }}>
                  {activeMedia + 1} / {media.length}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {data.text ? (
          <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
            <Text style={ui.body}>{data.text}</Text>
          </View>
        ) : null}

        {comments > 0 ? (
          <Pressable
            onPress={() => commentsRef.current?.present()}
            style={{
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
            }}
          >
            <Text style={[ui.meta, { color: semantic.inkDim }]}>
              Посмотреть все комментарии ({comments})
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <ReaderBar
        liked={liked}
        bookmarked={bookmarked}
        likes={likes}
        comments={comments}
        bookmarks={bookmarks}
        onLike={onLike}
        onBookmark={onBookmark}
        onOpenComments={() => commentsRef.current?.present()}
        shareText={data.text?.slice(0, 120)}
      />

      <CommentsSheet
        ref={commentsRef}
        type="post"
        id={data.id ?? null}
        onCountChange={setComments}
      />
    </Screen>
  );
}
