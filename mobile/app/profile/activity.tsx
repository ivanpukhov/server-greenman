import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import { semantic, greenman } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { EmptyState } from '@/components/common/EmptyState';
import { formatRelativeRu } from '@/lib/format/relativeTime';

type ActivityItem = {
  kind: 'post' | 'article' | 'reel' | 'webinar';
  likedAt: string;
  data: {
    id: number;
    slug?: string;
    title?: string;
    text?: string;
    description?: string;
    cover?: { url?: string | null; blurhash?: string | null } | null;
    thumbnail?: { url?: string | null; blurhash?: string | null } | null;
    media?: Array<{ url?: string | null; blurhash?: string | null }>;
  };
};

export default function ActivityScreen() {
  const query = useQuery({
    queryKey: ['social', 'profile', 'activity'],
    queryFn: async () => {
      const res = (await socialApi.profile.activity()) as { items: ActivityItem[] };
      return Array.isArray(res?.items) ? res.items : [];
    },
  });

  const items = query.data ?? [];

  const openItem = (it: ActivityItem) => {
    if (it.kind === 'article' && it.data.slug) router.push(`/social/article/${it.data.slug}`);
    else if (it.kind === 'webinar' && it.data.slug) router.push(`/social/webinar/${it.data.slug}`);
    else if (it.kind === 'post') router.push(`/social/post/${it.data.id}`);
    else if (it.kind === 'reel') router.push('/reels');
  };

  return (
    <Screen>
      <Header title="Активность" />
      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={greenman[7]} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          title="Пока пусто"
          subtitle="Ставьте лайки — здесь появится история."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it, idx) => `${it.kind}-${it.data.id}-${idx}`}
          renderItem={({ item }) => <ActivityRow item={item} onPress={() => openItem(item)} />}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: semantic.border, marginLeft: 92 }} />
          )}
          contentContainerStyle={{ paddingVertical: spacing.xs }}
        />
      )}
    </Screen>
  );
}

function ActivityRow({ item, onPress }: { item: ActivityItem; onPress: () => void }) {
  const cover =
    item.data.cover?.url ??
    item.data.thumbnail?.url ??
    item.data.media?.[0]?.url ??
    null;
  const blurhash =
    item.data.cover?.blurhash ??
    item.data.thumbnail?.blurhash ??
    item.data.media?.[0]?.blurhash ??
    null;
  const title = item.data.title ?? item.data.text ?? item.data.description ?? '—';
  const kindLabel =
    item.kind === 'article'
      ? 'Статья'
      : item.kind === 'post'
      ? 'Пост'
      : item.kind === 'reel'
      ? 'Reel'
      : 'Вебинар';

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radii.md,
          overflow: 'hidden',
          backgroundColor: semantic.surfaceSunken,
        }}
      >
        {cover ? (
          <Image
            source={{ uri: cover }}
            placeholder={blurhash ? { blurhash } : undefined}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="heart" size={22} color={semantic.inkMuted} />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="heart" size={12} color={greenman[7]} />
          <Text
            style={{
              fontFamily: 'Manrope_500Medium',
              fontSize: 11,
              color: greenman[7],
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            {kindLabel} · {formatRelativeRu(item.likedAt)}
          </Text>
        </View>
        <Text
          numberOfLines={2}
          style={{
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 15,
            color: semantic.ink,
            marginTop: 2,
          }}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
