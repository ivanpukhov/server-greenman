import { memo, type ReactNode } from 'react';
import { Pressable, View, type AccessibilityRole } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';
import { semantic, greenman } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { formatRelativeRu } from '@/lib/format/relativeTime';
import type { FeedKind } from '@/features/social/types';

export const KIND_META: Record<
  FeedKind,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  post: { label: 'Пост', icon: 'chatbubble-ellipses-outline', color: greenman[7] },
  article: { label: 'Статья', icon: 'book-outline', color: '#2563eb' },
  reel: { label: 'Reel', icon: 'play-circle', color: '#ef4444' },
  webinar: { label: 'Вебинар', icon: 'videocam-outline', color: '#7c3aed' },
  course: { label: 'Курс', icon: 'school-outline', color: '#b45309' },
  story: { label: 'Сторис', icon: 'aperture-outline', color: greenman[7] },
};

export function KindBadge({ kind }: { kind: FeedKind }) {
  const meta = KIND_META[kind];
  return (
    <View
      className="flex-row items-center gap-1 rounded-full bg-white/95 px-2.5 py-1"
      style={{ alignSelf: 'flex-start' }}
    >
      <Ionicons name={meta.icon} size={12} color={meta.color} />
      <Text className="text-[10px] font-bold uppercase" style={{ color: meta.color }}>
        {meta.label}
      </Text>
    </View>
  );
}

type ShellProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  children: ReactNode;
};

export function CardShell({
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityRole,
  children,
}: ShellProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? 'button'}
      className="mx-sm mb-sm overflow-hidden rounded-lg bg-surface active:opacity-95"
      style={shadows.card}
    >
      {children}
    </Pressable>
  );
}

export type CardAuthor = {
  name: string;
  avatarUrl?: string | null;
};

export function CardHeader({
  author,
  kind,
  publishedAt,
  onMore,
}: {
  author: CardAuthor;
  kind: FeedKind;
  publishedAt?: string | null;
  onMore?: () => void;
}) {
  return (
    <View className="flex-row items-center gap-sm px-md pt-sm pb-xs">
      <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-surface-muted">
        {author.avatarUrl ? (
          <Image source={{ uri: author.avatarUrl }} style={{ width: 36, height: 36 }} />
        ) : (
          <Ionicons name="leaf" size={18} color={semantic.accent} />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-label text-ink">{author.name}</Text>
        {publishedAt ? (
          <Text className="text-meta text-ink-dim">{formatRelativeRu(publishedAt)}</Text>
        ) : null}
      </View>
      <KindBadge kind={kind} />
      {onMore ? (
        <Pressable
          onPress={onMore}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Ещё"
          className="ml-xs p-1"
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={semantic.inkDim} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function CardBody({ children }: { children: ReactNode }) {
  return <View className="px-md pt-xs pb-sm">{children}</View>;
}

type EngagementProps = {
  likes: number;
  comments: number;
  bookmarks: number;
  reposts: number;
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
  onLike: () => void;
  onComment: () => void;
  onBookmark: () => void;
  onRepost: () => void;
  onShare: () => void;
};

function ActionButton({
  icon,
  iconFilled,
  active,
  count,
  onPress,
  accessibilityLabel,
  activeColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled?: keyof typeof Ionicons.glyphMap;
  active: boolean;
  count?: number;
  onPress: () => void;
  accessibilityLabel: string;
  activeColor?: string;
}) {
  const name = active && iconFilled ? iconFilled : icon;
  const color = active ? (activeColor ?? semantic.accent) : semantic.inkDim;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      className="flex-row items-center gap-xs active:opacity-70"
    >
      <Ionicons name={name} size={22} color={color} />
      {typeof count === 'number' ? (
        <Text className="text-caption" style={{ color: semantic.inkDim }}>
          {formatCount(count)}
        </Text>
      ) : null}
    </Pressable>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function CardEngagement({
  likes,
  comments,
  bookmarks,
  reposts,
  liked,
  bookmarked,
  reposted,
  onLike,
  onComment,
  onBookmark,
  onRepost,
  onShare,
}: EngagementProps) {
  return (
    <View
      className="flex-row items-center gap-lg px-md py-sm"
      style={{ borderTopWidth: 1, borderTopColor: semantic.border }}
    >
      <ActionButton
        icon="heart-outline"
        iconFilled="heart"
        active={liked}
        count={likes}
        onPress={onLike}
        accessibilityLabel={liked ? 'Убрать лайк' : 'Поставить лайк'}
        activeColor="#e11d48"
      />
      <ActionButton
        icon="chatbubble-outline"
        active={false}
        count={comments}
        onPress={onComment}
        accessibilityLabel="Комментарии"
      />
      <ActionButton
        icon="repeat-outline"
        iconFilled="repeat"
        active={reposted}
        count={reposts}
        onPress={onRepost}
        accessibilityLabel={reposted ? 'Убрать репост' : 'Репостнуть'}
        activeColor={greenman[7]}
      />
      <View style={{ flex: 1 }} />
      <ActionButton
        icon="paper-plane-outline"
        active={false}
        onPress={onShare}
        accessibilityLabel="Поделиться"
      />
      <ActionButton
        icon="bookmark-outline"
        iconFilled="bookmark"
        active={bookmarked}
        count={bookmarks}
        onPress={onBookmark}
        accessibilityLabel={bookmarked ? 'Убрать из сохранённого' : 'Сохранить'}
      />
    </View>
  );
}

type ContentCardProps = {
  author: CardAuthor;
  kind: FeedKind;
  publishedAt?: string | null;
  onPress?: () => void;
  onMore?: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
  engagement?: EngagementProps;
};

export const ContentCard = memo(function ContentCard({
  author,
  kind,
  publishedAt,
  onPress,
  onMore,
  children,
  accessibilityLabel,
  engagement,
}: ContentCardProps) {
  return (
    <CardShell onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <CardHeader author={author} kind={kind} publishedAt={publishedAt} onMore={onMore} />
      {children}
      {engagement ? <CardEngagement {...engagement} /> : null}
    </CardShell>
  );
});
