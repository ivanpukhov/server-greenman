import { memo, useState } from 'react';
import { Pressable, View, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { semantic } from '@/theme/colors';
import { formatRelativeRu } from '@/lib/format/relativeTime';
import type { FeedItem, FeedKind, MediaRef } from '@/features/social/types';
import {
  CardShell,
  CardHeader,
  CardBody,
  CardEngagement,
  KindBadge,
} from './ContentCard';

const screenWidth = Dimensions.get('window').width;
const CARD_WIDTH = screenWidth - 24;

/**
 * Back-compat тип — feed.tsx уже импортирует FeedRawItem / NormalizedCard.
 * Сохраняем имена, но внутри всё FeedItem.
 */
export type FeedRawItem = FeedItem;
export type NormalizedCard = FeedItem;

export function normalizeFeedItem(raw: any): FeedItem {
  // Сервер теперь возвращает уже нормализованные FeedItem.
  // Ниже — защита для старых ответов формата { kind, data: {...} }.
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
      views: typeof d.viewCount === 'number' ? d.viewCount : undefined,
    },
    me: { liked: false, bookmarked: false },
  };
}

type Props = {
  item: FeedItem;
  onPress: () => void;
  onLike: () => void;
  onComment: () => void;
  onBookmark: () => void;
  onShare?: () => void;
};

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

function Engagement(
  props: Pick<Props, 'item' | 'onLike' | 'onComment' | 'onBookmark' | 'onShare'>
) {
  const eng = props.item.engagement ?? { likes: 0, comments: 0, bookmarks: 0 };
  const me = props.item.me ?? { liked: false, bookmarked: false };
  return (
    <CardEngagement
      likes={eng.likes ?? 0}
      comments={eng.comments ?? 0}
      bookmarks={eng.bookmarks ?? 0}
      liked={me.liked ?? false}
      bookmarked={me.bookmarked ?? false}
      onLike={props.onLike}
      onComment={props.onComment}
      onBookmark={props.onBookmark}
      onShare={props.onShare}
    />
  );
}

function authorOf(item: FeedItem) {
  return { name: 'Greenman', avatarUrl: null };
}

function PostCard(props: Props) {
  const { item, onPress } = props;
  const media = (item.media ?? []).filter((m): m is MediaRef => !!m?.url);
  const [activeIdx, setActiveIdx] = useState(0);
  const hasMedia = media.length > 0;
  const heroHeight = hasMedia ? CARD_WIDTH : 0;

  return (
    <CardShell onPress={onPress} accessibilityLabel={item.text?.slice(0, 40) ?? 'Пост'}>
      <CardHeader author={authorOf(item)} kind="post" publishedAt={item.publishedAt} />
      {hasMedia ? (
        <View>
          <View style={{ width: CARD_WIDTH, height: heroHeight }}>
            <Image
              source={{ uri: media[activeIdx].url, blurhash: media[activeIdx].blurhash ?? undefined }}
              style={{ flex: 1, backgroundColor: '#eef1ee' }}
              contentFit="cover"
              transition={200}
            />
          </View>
          {media.length > 1 ? (
            <View className="absolute bottom-xs left-0 right-0 flex-row items-center justify-center gap-1.5">
              {media.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => setActiveIdx(i)}
                  hitSlop={8}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: i === activeIdx ? '#fff' : 'rgba(255,255,255,0.55)' }}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      {item.text ? (
        <CardBody>
          <Text className="text-body text-ink" numberOfLines={6}>
            {item.text}
          </Text>
        </CardBody>
      ) : null}
      <Engagement {...props} />
    </CardShell>
  );
}

function ArticleCard(props: Props) {
  const { item, onPress } = props;
  const coverUrl = item.cover?.url ?? null;
  const height = Math.round((CARD_WIDTH * 9) / 16);

  return (
    <CardShell onPress={onPress} accessibilityLabel={item.title ?? 'Статья'}>
      <CardHeader author={authorOf(item)} kind="article" publishedAt={item.publishedAt} />
      <View style={{ width: CARD_WIDTH, height, backgroundColor: '#e5e7eb' }}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl, blurhash: item.cover?.blurhash ?? undefined }}
            style={{ flex: 1 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="book-outline" size={36} color="#9ca3af" />
          </View>
        )}
      </View>
      <CardBody>
        {item.title ? (
          <Text className="text-h2 font-bold text-ink" numberOfLines={2}>
            {item.title}
          </Text>
        ) : null}
        {item.excerpt ? (
          <Text className="mt-xs text-label font-sans text-ink-dim" numberOfLines={3}>
            {item.excerpt}
          </Text>
        ) : null}
      </CardBody>
      <Engagement {...props} />
    </CardShell>
  );
}

function ReelCard(props: Props) {
  const { item, onPress } = props;
  const thumb = item.cover?.url ?? item.video?.thumbnailUrl ?? null;
  const height = Math.min(520, Math.round((CARD_WIDTH * 16) / 9));

  return (
    <CardShell onPress={onPress} accessibilityLabel={item.description ?? 'Reel'}>
      <CardHeader author={authorOf(item)} kind="reel" publishedAt={item.publishedAt} />
      <View style={{ width: CARD_WIDTH, height, backgroundColor: '#111827' }}>
        {thumb ? (
          <Image
            source={{ uri: thumb, blurhash: item.cover?.blurhash ?? undefined }}
            style={{ flex: 1 }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-black/45">
            <Ionicons name="play" size={30} color="#fff" />
          </View>
        </View>
        {item.description ? (
          <View className="absolute bottom-0 left-0 right-0 px-md py-sm">
            <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} />
            <Text className="text-body text-white" numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        ) : null}
      </View>
      <Engagement {...props} />
    </CardShell>
  );
}

function WebinarCard(props: Props) {
  const { item, onPress } = props;
  const coverUrl = item.cover?.url ?? item.video?.url ?? null;
  const height = Math.round((CARD_WIDTH * 9) / 16);

  return (
    <CardShell onPress={onPress} accessibilityLabel={item.title ?? 'Вебинар'}>
      <CardHeader author={authorOf(item)} kind="webinar" publishedAt={item.publishedAt} />
      <View style={{ width: CARD_WIDTH, height, backgroundColor: '#1f2937' }}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl, blurhash: item.cover?.blurhash ?? undefined }}
            style={{ flex: 1 }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        {item.video?.url ? (
          <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-black/45">
              <Ionicons name="play" size={26} color="#fff" />
            </View>
          </View>
        ) : null}
      </View>
      <CardBody>
        {item.title ? (
          <Text className="text-h2 font-bold text-ink" numberOfLines={2}>
            {item.title}
          </Text>
        ) : null}
        {item.publishedAt ? (
          <Text className="mt-xs text-meta text-ink-dim">
            {formatRelativeRu(item.publishedAt)}
          </Text>
        ) : null}
      </CardBody>
      <Engagement {...props} />
    </CardShell>
  );
}

export { KindBadge };
