import { View, Pressable, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { semantic } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = {
  liked: boolean;
  bookmarked: boolean;
  likes: number;
  comments: number;
  bookmarks: number;
  onLike: () => void;
  onBookmark: () => void;
  onOpenComments: () => void;
  shareUrl?: string;
  shareText?: string;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function ReaderBar(props: Props) {
  const onShare = async () => {
    Haptics.selectionAsync().catch(() => {});
    try {
      await Share.share({
        message: props.shareText
          ? `${props.shareText}${props.shareUrl ? ` ${props.shareUrl}` : ''}`
          : props.shareUrl ?? '',
        url: props.shareUrl,
      });
    } catch {}
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: semantic.surface,
        borderTopWidth: 1,
        borderTopColor: semantic.border,
      }}
    >
      <Action
        icon={props.liked ? 'heart' : 'heart-outline'}
        color={props.liked ? '#e11d48' : semantic.inkDim}
        count={props.likes}
        onPress={props.onLike}
        label={props.liked ? 'Убрать лайк' : 'Поставить лайк'}
      />
      <Action
        icon="chatbubble-outline"
        color={semantic.inkDim}
        count={props.comments}
        onPress={props.onOpenComments}
        label="Комментарии"
      />
      <View style={{ flex: 1 }} />
      <Action icon="paper-plane-outline" color={semantic.inkDim} onPress={onShare} label="Поделиться" />
      <Action
        icon={props.bookmarked ? 'bookmark' : 'bookmark-outline'}
        color={props.bookmarked ? semantic.accent : semantic.inkDim}
        count={props.bookmarks}
        onPress={props.onBookmark}
        label={props.bookmarked ? 'Убрать из сохранённого' : 'Сохранить'}
      />
    </View>
  );
}

function Action({
  icon,
  color,
  count,
  onPress,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  count?: number;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
      <Ionicons name={icon} size={24} color={color} />
      {typeof count === 'number' && count > 0 ? (
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: semantic.inkDim }}>
          {formatCount(count)}
        </Text>
      ) : null}
    </Pressable>
  );
}
