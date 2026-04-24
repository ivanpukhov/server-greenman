import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  View,
  Dimensions,
  Share,
  type ViewToken,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import { useToggleReaction, useToggleBookmark } from '@/hooks/useFeed';
import { CommentsSheet, type CommentsSheetRef } from '@/components/social/CommentsSheet';

const { height: SCREEN_H } = Dimensions.get('window');

type Reel = {
  id: number;
  description?: string | null;
  video?: { url?: string | null } | null;
  thumbnail?: { url?: string | null } | null;
  engagement?: { likes: number; comments: number; bookmarks: number; views?: number };
  me?: { liked: boolean; bookmarked: boolean };
};

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`.replace('.0', '');
  return `${(n / 1_000_000).toFixed(1)}M`.replace('.0', '');
}

export default function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Reel[]>([]);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(false);
  const [screenFocused, setScreenFocused] = useState(true);
  const commentsRef = useRef<CommentsSheetRef>(null);
  const [commentsReelId, setCommentsReelId] = useState<number | null>(null);

  useEffect(() => {
    socialApi.reels
      .list({ limit: 20 })
      .then((r) => setItems(Array.isArray(r) ? (r as Reel[]) : []))
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, [])
  );

  const onViewable = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems?.[0]?.index;
      if (typeof first === 'number') {
        setActive(first);
        const it = items[first];
        if (it?.id) socialApi.reels.view(it.id).catch(() => {});
      }
    },
    [items]
  );

  const viewConfig = useMemo(() => ({ itemVisiblePercentThreshold: 80 }), []);

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        pagingEnabled
        snapToInterval={SCREEN_H}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={viewConfig}
        ListEmptyComponent={
          <View style={{ height: SCREEN_H }} className="items-center justify-center">
            <Text className="text-sm text-white/60">Пока нет Reels</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <ReelItem
            reel={item}
            isActive={index === active && screenFocused}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            insetsBottom={insets.bottom}
            onOpenComments={() => {
              setCommentsReelId(item.id);
              commentsRef.current?.present();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }}
            onReelUpdate={(patch) => {
              setItems((prev) =>
                prev.map((r) => (r.id === item.id ? { ...r, ...patch } : r))
              );
            }}
          />
        )}
      />

      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/feed'))}
        accessibilityRole="button"
        accessibilityLabel="Назад"
        hitSlop={10}
        style={{ position: 'absolute', top: insets.top + 8, left: 12 }}
        className="h-10 w-10 items-center justify-center rounded-full bg-black/40 active:opacity-70"
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Pressable>

      {commentsReelId != null ? (
        <CommentsSheet
          ref={commentsRef}
          type="reel"
          id={commentsReelId}
          onCountChange={(count) => {
            setItems((prev) =>
              prev.map((r) =>
                r.id === commentsReelId
                  ? {
                      ...r,
                      engagement: {
                        likes: r.engagement?.likes ?? 0,
                        bookmarks: r.engagement?.bookmarks ?? 0,
                        views: r.engagement?.views ?? 0,
                        comments: count,
                      },
                    }
                  : r
              )
            );
          }}
        />
      ) : null}
    </View>
  );
}

function ReelItem({
  reel,
  isActive,
  muted,
  onToggleMute,
  insetsBottom,
  onOpenComments,
  onReelUpdate,
}: {
  reel: Reel;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
  insetsBottom: number;
  onOpenComments: () => void;
  onReelUpdate: (patch: Partial<Reel>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggleReaction = useToggleReaction();
  const toggleBookmark = useToggleBookmark();

  const liked = reel.me?.liked ?? false;
  const bookmarked = reel.me?.bookmarked ?? false;
  const likes = reel.engagement?.likes ?? 0;
  const comments = reel.engagement?.comments ?? 0;
  const bookmarks = reel.engagement?.bookmarks ?? 0;

  const onLike = () => {
    const nextLiked = !liked;
    onReelUpdate({
      me: { liked: nextLiked, bookmarked },
      engagement: {
        likes: Math.max(0, likes + (nextLiked ? 1 : -1)),
        comments,
        bookmarks,
        views: reel.engagement?.views ?? 0,
      },
    });
    toggleReaction.mutate(
      { type: 'reel', id: reel.id },
      {
        onSuccess: (data) => {
          onReelUpdate({
            me: { liked: data.reacted, bookmarked },
            engagement: {
              likes: data.count,
              comments,
              bookmarks,
              views: reel.engagement?.views ?? 0,
            },
          });
        },
        onError: () => {
          onReelUpdate({
            me: { liked, bookmarked },
            engagement: { likes, comments, bookmarks, views: reel.engagement?.views ?? 0 },
          });
        },
      }
    );
  };

  const onBookmark = () => {
    const nextBookmarked = !bookmarked;
    onReelUpdate({
      me: { liked, bookmarked: nextBookmarked },
      engagement: {
        likes,
        comments,
        bookmarks: Math.max(0, bookmarks + (nextBookmarked ? 1 : -1)),
        views: reel.engagement?.views ?? 0,
      },
    });
    toggleBookmark.mutate(
      { type: 'reel', id: reel.id },
      {
        onSuccess: (data) => {
          onReelUpdate({
            me: { liked, bookmarked: data.bookmarked },
            engagement: {
              likes,
              comments,
              bookmarks: data.count,
              views: reel.engagement?.views ?? 0,
            },
          });
        },
        onError: () => {
          onReelUpdate({
            me: { liked, bookmarked },
            engagement: { likes, comments, bookmarks, views: reel.engagement?.views ?? 0 },
          });
        },
      }
    );
  };

  const onShare = () => {
    Share.share({
      message: reel.description ?? 'Reel',
    }).catch(() => {});
  };

  return (
    <Pressable
      onPress={onToggleMute}
      style={{ height: SCREEN_H, justifyContent: 'center', backgroundColor: '#000' }}
    >
      {reel.video?.url ? (
        <Video
          source={{ uri: reel.video.url }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isLooping
          isMuted={muted}
        />
      ) : null}

      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 220,
        }}
      />

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: 12,
          bottom: insetsBottom + 90,
          alignItems: 'center',
          gap: 20,
        }}
      >
        <SideAction
          icon={liked ? 'heart' : 'heart-outline'}
          color={liked ? '#EF4F5E' : '#fff'}
          label={formatCount(likes)}
          onPress={onLike}
        />
        <SideAction
          icon="chatbubble-outline"
          color="#fff"
          label={formatCount(comments)}
          onPress={onOpenComments}
        />
        <SideAction
          icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
          color="#fff"
          label={formatCount(bookmarks)}
          onPress={onBookmark}
        />
        <SideAction icon="paper-plane-outline" color="#fff" label="Share" onPress={onShare} />
        <SideAction
          icon={muted ? 'volume-mute' : 'volume-high'}
          color="#fff"
          label={muted ? 'Off' : 'On'}
          onPress={onToggleMute}
        />
      </View>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: insetsBottom + 20,
          left: 16,
          right: 80,
        }}
      >
        {reel.description ? (
          <Pressable onPress={() => setExpanded((e) => !e)}>
            <Text
              className="text-[14px] text-white"
              style={{ lineHeight: 20 }}
              numberOfLines={expanded ? undefined : 3}
            >
              {reel.description}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function SideAction({
  icon,
  color,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{ alignItems: 'center' }}
      accessibilityRole="button"
    >
      <View
        style={{
          width: 46,
          height: 46,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={30} color={color} />
      </View>
      <Text
        className="text-[12px] text-white"
        style={{ fontFamily: 'Manrope_600SemiBold', marginTop: 2 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
