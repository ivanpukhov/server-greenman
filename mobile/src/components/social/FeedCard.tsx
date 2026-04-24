import { memo, useState, useCallback } from 'react';
import { View, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { cssInterop } from 'nativewind';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { greenman, clay, sun } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { formatRelativeRu } from '@/lib/format/relativeTime';
import type { FeedItem, FeedKind, MediaRef } from '@/features/social/types';

cssInterop(LinearGradient, { className: 'style' });
cssInterop(Image, { className: 'style' });

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 32;

export type FeedRawItem = FeedItem;
export type NormalizedCard = FeedItem;

export function normalizeFeedItem(raw: any): FeedItem {
  if (raw && raw.entityId && raw.engagement) return raw as FeedItem;
  const d = raw?.data ?? raw ?? {};
  const kind: FeedKind = raw?.kind ?? 'post';
  return {
    id: `${kind}-${d.id}`,
    kind,
    entityId: d.id,
    publishedAt: raw?.publishedAt ?? d.publishedAt,
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
  };
}

type Props = {
  item: FeedItem;
  onPress: () => void;
  onLike: () => void;
  onComment: () => void;
  onBookmark: () => void;
  onRepost: () => void;
  onShare: () => void;
};

const KIND_META: Record<FeedKind, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  post: { label: 'Пост', icon: 'chatbubble-ellipses', color: greenman[8] },
  article: { label: 'Статья', icon: 'book', color: clay[5] },
  reel: { label: 'Reel', icon: 'play', color: '#e11d48' },
  webinar: { label: 'Вебинар', icon: 'videocam', color: '#6f4684' },
  course: { label: 'Курс', icon: 'school', color: sun[3] },
  story: { label: 'Сторис', icon: 'aperture', color: greenman[7] },
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ActionBtn({
  icon,
  filled,
  active,
  count,
  activeColor,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  filled?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  count?: number;
  activeColor?: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const name = active && filled ? filled : icon;
  const color = active ? activeColor ?? '#e11d48' : '#1c2a22';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="flex-row items-center gap-1.5 active:opacity-60"
    >
      <Ionicons name={name} size={22} color={color} />
      {typeof count === 'number' && count > 0 ? (
        <Text
          className={`text-[12px] font-semibold ${active ? '' : 'text-ink-dim'}`}
          style={active ? { color } : undefined}
        >
          {formatCount(count)}
        </Text>
      ) : null}
    </Pressable>
  );
}

function Engagement({ p, flat }: { p: Props; flat?: boolean }) {
  const eng = p.item.engagement ?? { likes: 0, comments: 0, bookmarks: 0, reposts: 0 };
  const me = p.item.me ?? { liked: false, bookmarked: false, reposted: false };
  return (
    <View
      className={`flex-row items-center gap-5 px-5 py-4 ${flat ? '' : 'border-t border-border'}`}
    >
      <ActionBtn
        icon="heart-outline"
        filled="heart"
        active={me.liked}
        count={eng.likes ?? 0}
        activeColor="#e11d48"
        onPress={p.onLike}
        accessibilityLabel="Лайк"
      />
      <ActionBtn
        icon="chatbubble-outline"
        count={eng.comments ?? 0}
        onPress={p.onComment}
        accessibilityLabel="Комментарии"
      />
      <ActionBtn
        icon="repeat-outline"
        filled="repeat"
        active={me.reposted}
        count={eng.reposts ?? 0}
        activeColor={greenman[7]}
        onPress={p.onRepost}
        accessibilityLabel="Репост"
      />
      <View className="flex-1" />
      <ActionBtn
        icon="paper-plane-outline"
        onPress={p.onShare}
        accessibilityLabel="Поделиться"
      />
      <ActionBtn
        icon="bookmark-outline"
        filled="bookmark"
        active={me.bookmarked}
        activeColor={greenman[8]}
        onPress={p.onBookmark}
        accessibilityLabel="Сохранить"
      />
    </View>
  );
}

function KindTag({ kind, absolute }: { kind: FeedKind; absolute?: boolean }) {
  const m = KIND_META[kind];
  return (
    <View
      className={`flex-row items-center gap-1 rounded-pill bg-white px-2.5 py-1 ${absolute ? '' : 'self-start'}`}
      style={shadows.soft}
    >
      <Ionicons name={m.icon} size={11} color={m.color} />
      <Text
        className="text-[10px] font-bold uppercase"
        style={{ color: m.color }}
        tracking="wide"
      >
        {m.label}
      </Text>
    </View>
  );
}

function Author({
  name,
  avatarUrl,
  publishedAt,
  tone = 'ink',
}: {
  name: string;
  avatarUrl?: string | null;
  publishedAt?: string | null;
  tone?: 'ink' | 'white';
}) {
  const textName = tone === 'white' ? 'text-white' : 'text-ink';
  const textMeta = tone === 'white' ? 'text-white/70' : 'text-ink-dim';
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-pill bg-sand-1">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 36, height: 36 }} />
        ) : (
          <Ionicons name="leaf" size={16} color={greenman[8]} />
        )}
      </View>
      <View className="flex-1">
        <Text className={`text-[13px] font-bold ${textName}`} tracking="tight">{name}</Text>
        {publishedAt ? (
          <Text className={`text-[11px] ${textMeta}`}>{formatRelativeRu(publishedAt)}</Text>
        ) : null}
      </View>
    </View>
  );
}

export const FeedCard = memo(function FeedCard(props: Props) {
  switch (props.item.kind) {
    case 'post':
      return <PostCard {...props} />;
    case 'article':
      return <ArticleCard {...props} />;
    case 'reel':
      return <ReelCard {...props} />;
    case 'webinar':
      return <WebinarCard {...props} />;
    default:
      return null;
  }
});

function authorOf(_item: FeedItem) {
  return { name: 'Greenman', avatarUrl: null };
}

/* ============================================================ */
/*                        POST CARD                              */
/*  Visual: 4:5 photo, rounded-2xl, gradient overlay + text      */
/*  Engagement bar FLOATS below as separate white card           */
/* ============================================================ */
function PostCard(props: Props) {
  const { item, onPress } = props;
  const media = (item.media ?? []).filter((m): m is MediaRef => !!m?.url);
  const [idx, setIdx] = useState(0);
  const hasMedia = media.length > 0;
  const height = Math.round(CARD_W * 1.2);

  return (
    <Animated.View entering={FadeIn.duration(220)} className="mx-4 mb-8">
      <View style={{ width: CARD_W }}>
      {hasMedia ? (
        <AnimatedPressable
          onPress={onPress}
          haptic="selection"
          scale={0.99}
          wrapperStyle={shadows.card}
          className="overflow-hidden rounded-2xl"
        >
          <View style={{ width: CARD_W, height }}>
            <Image
              source={{ uri: media[idx].url, blurhash: media[idx].blurhash ?? undefined }}
              style={{ flex: 1, backgroundColor: '#eef1ee' }}
              contentFit="cover"
              transition={200}
            />
            {/* top gradient */}
            <LinearGradient
              colors={['rgba(0,0,0,0.45)', 'transparent']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100 }}
            />
            {/* bottom gradient */}
            <LinearGradient
              colors={['transparent', 'rgba(5,33,15,0.85)']}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 190 }}
            />
            {/* top: author + kind */}
            <View className="absolute left-0 right-0 top-0 flex-row items-start justify-between p-4">
              <View className="flex-1">
                <Author {...authorOf(item)} publishedAt={item.publishedAt} tone="white" />
              </View>
              <KindTag kind="post" />
            </View>
            {/* bottom text */}
            {item.text ? (
              <View className="absolute bottom-0 left-0 right-0 p-5">
                <Text
                  className="text-[16px] leading-[22px] text-white"
                  numberOfLines={4}
                >
                  {item.text}
                </Text>
              </View>
            ) : null}
            {/* carousel dots */}
            {media.length > 1 ? (
              <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
                {media.map((_, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setIdx(i)}
                    hitSlop={8}
                    style={{
                      height: 6,
                      width: i === idx ? 18 : 6,
                      borderRadius: 3,
                      backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.5)',
                    }}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </AnimatedPressable>
      ) : (
        <AnimatedPressable
          onPress={onPress}
          scale={0.99}
          haptic="selection"
          wrapperStyle={shadows.soft}
          className="overflow-hidden rounded-2xl bg-surface p-5"
        >
          <View className="flex-row items-center justify-between">
            <Author {...authorOf(item)} publishedAt={item.publishedAt} />
            <KindTag kind="post" />
          </View>
          {item.text ? (
            <Text className="mt-4 text-[16px] leading-[24px] text-ink" numberOfLines={8}>
              {item.text}
            </Text>
          ) : null}
        </AnimatedPressable>
      )}
      {/* engagement bar — overlapped */}
      <View
        className="-mt-5 overflow-hidden rounded-lg bg-surface"
        style={shadows.card}
      >
        <Engagement p={props} flat />
      </View>
      </View>
    </Animated.View>
  );
}

/* ============================================================ */
/*                      ARTICLE CARD                             */
/*  Visual: horizontal read-card on cream bg with side image     */
/* ============================================================ */
function ArticleCard(props: Props) {
  const { item, onPress } = props;
  const coverUrl = item.cover?.url ?? null;
  const [saved, setSaved] = useState(item.me?.bookmarked ?? false);
  const onBookmark = useCallback(() => {
    setSaved((v) => !v);
    props.onBookmark();
  }, [props]);

  return (
    <Animated.View entering={FadeIn.duration(220)} className="mx-4 mb-6">
      <AnimatedPressable
        onPress={onPress}
        haptic="selection"
        scale={0.99}
        wrapperStyle={shadows.soft}
        className="overflow-hidden rounded-xl bg-surface-cream"
      >
        <View className="flex-row gap-4 p-4">
          <View className="h-[116px] w-[92px] overflow-hidden rounded-md bg-sand-2">
            {coverUrl ? (
              <Image
                source={{ uri: coverUrl, blurhash: item.cover?.blurhash ?? undefined }}
                style={{ flex: 1 }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="book" size={28} color={clay[5]} />
              </View>
            )}
          </View>
          <View className="flex-1 justify-between">
            <View>
              <View className="flex-row items-center gap-2">
                <Text
                  className="text-[10px] font-bold uppercase text-clay-5"
                  tracking="widest"
                >
                  Статья
                </Text>
                {item.publishedAt ? (
                  <>
                    <View className="h-0.5 w-0.5 rounded-pill bg-ink-muted" />
                    <Text className="text-[10px] text-ink-muted">
                      {formatRelativeRu(item.publishedAt)}
                    </Text>
                  </>
                ) : null}
              </View>
              {item.title ? (
                <Text
                  className="mt-2 font-serif text-[18px] leading-[22px] text-ink"
                  numberOfLines={3}
                  tracking="tight"
                >
                  {item.title}
                </Text>
              ) : null}
              {item.excerpt ? (
                <Text
                  className="mt-1.5 text-[12px] leading-[16px] text-ink-dim"
                  numberOfLines={2}
                >
                  {item.excerpt}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </AnimatedPressable>
      <View className="mt-2 flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-4">
          <ActionBtn
            icon="heart-outline"
            filled="heart"
            active={item.me?.liked}
            count={item.engagement?.likes ?? 0}
            activeColor="#e11d48"
            onPress={props.onLike}
            accessibilityLabel="Лайк"
          />
          <ActionBtn
            icon="chatbubble-outline"
            count={item.engagement?.comments ?? 0}
            onPress={props.onComment}
            accessibilityLabel="Комментарии"
          />
        </View>
        <View className="flex-row items-center gap-3">
          <ActionBtn
            icon="paper-plane-outline"
            onPress={props.onShare}
            accessibilityLabel="Поделиться"
          />
          <ActionBtn
            icon="bookmark-outline"
            filled="bookmark"
            active={saved}
            activeColor={greenman[8]}
            onPress={onBookmark}
            accessibilityLabel="Сохранить"
          />
        </View>
      </View>
    </Animated.View>
  );
}

/* ============================================================ */
/*                       REEL CARD                               */
/*  Visual: vertical dark card 9:16 (cap 480), bold play pill    */
/* ============================================================ */
function ReelCard(props: Props) {
  const { item, onPress } = props;
  const thumb = item.cover?.url ?? item.video?.thumbnailUrl ?? null;
  const height = Math.min(480, Math.round((CARD_W * 16) / 9));

  return (
    <Animated.View entering={FadeIn.duration(220)} className="mx-4 mb-8">
      <AnimatedPressable
        onPress={onPress}
        haptic="selection"
        scale={0.99}
        wrapperStyle={shadows.float}
        className="overflow-hidden rounded-2xl bg-ink"
      >
        <View style={{ width: CARD_W, height }}>
          {thumb ? (
            <Image
              source={{ uri: thumb, blurhash: item.cover?.blurhash ?? undefined }}
              style={{ flex: 1 }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="videocam" size={36} color="#fff" />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent']}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 130 }}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 200 }}
          />
          {/* top bar */}
          <View className="absolute left-0 right-0 top-0 flex-row items-center justify-between p-4">
            <View className="flex-row items-center gap-2 rounded-pill bg-red-600/90 px-2.5 py-1">
              <Ionicons name="play" size={10} color="#fff" />
              <Text
                className="text-[10px] font-bold uppercase text-white"
                tracking="widest"
              >
                REEL
              </Text>
            </View>
            <Author {...authorOf(item)} publishedAt={item.publishedAt} tone="white" />
          </View>
          {/* bottom */}
          <View className="absolute bottom-0 left-0 right-0 p-5">
            {item.description ? (
              <Text
                className="font-serif text-[20px] leading-[24px] text-white"
                numberOfLines={3}
                tracking="tight"
              >
                {item.description}
              </Text>
            ) : null}
            <View className="mt-4 flex-row items-center justify-between">
              <AnimatedPressable
                onPress={onPress}
                haptic="light"
                scale={0.95}
                className="flex-row items-center gap-2 rounded-pill bg-white px-5 py-3"
              >
                <Ionicons name="play" size={14} color="#05210f" />
                <Text
                  className="text-[13px] font-bold text-ink"
                  tracking="tight"
                >
                  Смотреть
                </Text>
              </AnimatedPressable>
              <View className="flex-row items-center gap-4">
                <ActionBtn
                  icon="heart-outline"
                  filled="heart"
                  active={item.me?.liked}
                  count={item.engagement?.likes ?? 0}
                  activeColor="#ef4444"
                  onPress={props.onLike}
                  accessibilityLabel="Лайк"
                />
                <ActionBtn
                  icon="bookmark-outline"
                  filled="bookmark"
                  active={item.me?.bookmarked}
                  activeColor="#fff"
                  onPress={props.onBookmark}
                  accessibilityLabel="Сохранить"
                />
              </View>
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

/* ============================================================ */
/*                     WEBINAR CARD                              */
/*  Visual: 16:9 cover + dark ticket strip below                 */
/* ============================================================ */
function WebinarCard(props: Props) {
  const { item, onPress } = props;
  const coverUrl = item.cover?.url ?? item.video?.url ?? null;
  const height = Math.round((CARD_W * 9) / 16);

  return (
    <Animated.View entering={FadeIn.duration(220)} className="mx-4 mb-6">
      <AnimatedPressable
        onPress={onPress}
        haptic="selection"
        scale={0.99}
        wrapperStyle={shadows.card}
        className="overflow-hidden rounded-xl"
      >
        <View style={{ width: CARD_W, height, backgroundColor: '#1f2937' }}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl, blurhash: item.cover?.blurhash ?? undefined }}
              style={{ flex: 1 }}
              contentFit="cover"
              transition={200}
            />
          ) : null}
          <LinearGradient
            colors={['transparent', 'rgba(5,33,15,0.75)']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: height }}
          />
          {item.video?.url ? (
            <View
              pointerEvents="none"
              className="absolute inset-0 items-center justify-center"
            >
              <View
                className="h-16 w-16 items-center justify-center rounded-pill bg-white"
                style={shadows.float}
              >
                <Ionicons name="play" size={22} color={greenman[9]} style={{ marginLeft: 3 }} />
              </View>
            </View>
          ) : null}
          <View className="absolute left-4 top-4">
            <View
              className="flex-row items-center gap-1.5 rounded-pill px-2.5 py-1"
              style={{ backgroundColor: 'rgba(111,70,132,0.95)' }}
            >
              <Ionicons name="videocam" size={11} color="#fff" />
              <Text
                className="text-[10px] font-bold uppercase text-white"
                tracking="widest"
              >
                Вебинар
              </Text>
            </View>
          </View>
        </View>
        {/* ticket */}
        <View className="bg-ink px-5 py-4">
          {item.title ? (
            <Text
              className="font-serif text-[20px] leading-[24px] text-white"
              numberOfLines={2}
              tracking="tight"
            >
              {item.title}
            </Text>
          ) : null}
          <View className="mt-3 flex-row items-center gap-4">
            {item.publishedAt ? (
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.65)" />
                <Text className="text-[11px] text-white/60">
                  {formatRelativeRu(item.publishedAt)}
                </Text>
              </View>
            ) : null}
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="person-outline" size={13} color="rgba(255,255,255,0.65)" />
              <Text className="text-[11px] text-white/60">Greenman</Text>
            </View>
          </View>
        </View>
      </AnimatedPressable>
      <View className="mt-3 overflow-hidden rounded-lg bg-surface" style={shadows.soft}>
        <Engagement p={props} flat />
      </View>
    </Animated.View>
  );
}

export function KindBadge({ kind }: { kind: FeedKind }) {
  return <KindTag kind={kind} />;
}
