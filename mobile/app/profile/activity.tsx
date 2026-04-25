import { View, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { socialApi } from '@/features/social/api';
import { ink } from '@/theme/colors';
import { EmptyState } from '@/components/common/EmptyState';
import { formatRelativeRu } from '@/lib/format/relativeTime';
import { ProfileContentRow } from '@/components/social/ProfileContentRow';

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
          <ActivityIndicator color={ink.DEFAULT} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState title="Пока пусто" subtitle="Ставьте лайки — здесь появится история." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it, idx) => `${it.kind}-${it.data.id}-${idx}`}
          renderItem={({ item }) => <ActivityRow item={item} onPress={() => openItem(item)} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingVertical: 12 }}
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
    item.kind === 'article' ? 'Статья'
    : item.kind === 'post' ? 'Пост'
    : item.kind === 'reel' ? 'Reel'
    : 'Вебинар';

  return (
    <ProfileContentRow
      title={title}
      eyebrow={kindLabel}
      meta={`Вы лайкнули · ${formatRelativeRu(item.likedAt)}`}
      cover={cover}
      blurhash={blurhash}
      icon="heart"
      onPress={onPress}
    />
  );
}
