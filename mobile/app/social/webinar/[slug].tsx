import { useCallback, useRef, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
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
import { radii } from '@/theme/radii';
import { ui, reading } from '@/theme/typography';
import { formatRelativeRu } from '@/lib/format/relativeTime';

function formatBytes(n: number): string {
  if (!n) return '';
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export default function WebinarScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const commentsRef = useRef<CommentsSheetRef>(null);
  const videoRef = useRef<Video>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const q = useQuery<any, Error>({
    queryKey: ['social', 'webinars', 'detail', slug],
    queryFn: () => socialApi.webinars.get(slug!),
    enabled: !!slug,
  });

  const data = q.data;

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [bookmarks, setBookmarks] = useState(0);

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
      { type: 'webinar', id: data.id },
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
      { type: 'webinar', id: data.id },
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
        <Header title="Вебинар" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={semantic.accent} />
        </View>
      </Screen>
    );
  }

  if (q.isError || !data) {
    return (
      <Screen>
        <Header title="Вебинар" />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
        >
          <Ionicons name="cloud-offline-outline" size={40} color={semantic.inkDim} />
          <Text style={[ui.body, { color: semantic.inkDim, marginTop: spacing.sm }]}>
            Не удалось загрузить
          </Text>
        </View>
      </Screen>
    );
  }

  const videoUrl = data.video?.url;
  const coverUrl = data.cover?.url ?? data.video?.thumbnailUrl;
  const files: any[] = Array.isArray(data.files) ? data.files : [];

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={data.title} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }}>
          {videoUrl ? (
            <>
              <Video
                ref={videoRef}
                source={{ uri: videoUrl }}
                style={{ flex: 1 }}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls={videoPlaying}
                posterSource={coverUrl ? { uri: coverUrl } : undefined}
                posterStyle={{ resizeMode: 'cover' }}
                usePoster={!videoPlaying && !!coverUrl}
                onPlaybackStatusUpdate={(s) => {
                  if ('isLoaded' in s && s.isLoaded) {
                    setVideoPlaying(!!s.isPlaying);
                  }
                }}
              />
              {!videoPlaying ? (
                <Pressable
                  onPress={async () => {
                    setVideoPlaying(true);
                    await videoRef.current?.playAsync().catch(() => {});
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Воспроизвести"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="play" size={32} color="#fff" />
                  </View>
                </Pressable>
              ) : null}
            </>
          ) : coverUrl ? (
            <Image source={{ uri: coverUrl }} style={{ flex: 1 }} contentFit="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="videocam-outline" size={40} color="rgba(255,255,255,0.4)" />
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Text style={reading.h1}>{data.title}</Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              marginTop: spacing.sm,
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
              {data.publishedAt ? (
                <Text style={ui.meta}>{formatRelativeRu(data.publishedAt)}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ paddingTop: spacing.md }}>
          <BlockRenderer blocks={data.descriptionBlocks} />
        </View>

        {files.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <Text style={[ui.h3, { marginBottom: spacing.sm }]}>Материалы</Text>
            <View style={{ gap: spacing.xs }}>
              {files.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => f.url && Linking.openURL(f.url).catch(() => {})}
                  accessibilityRole="link"
                  accessibilityLabel={f.originalName ?? 'Файл'}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: spacing.md,
                    borderRadius: radii.md,
                    backgroundColor: semantic.surfaceSunken,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radii.sm,
                      backgroundColor: greenman[1],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="document-attach-outline" size={20} color={semantic.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ui.label} numberOfLines={1}>
                      {f.originalName ?? 'Файл'}
                    </Text>
                    {f.sizeBytes ? (
                      <Text style={ui.meta}>{formatBytes(f.sizeBytes)}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="download-outline" size={20} color={semantic.inkDim} />
                </Pressable>
              ))}
            </View>
          </View>
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
        shareText={data.title}
      />

      <CommentsSheet
        ref={commentsRef}
        type="webinar"
        id={data.id ?? null}
        onCountChange={setComments}
      />
    </Screen>
  );
}
