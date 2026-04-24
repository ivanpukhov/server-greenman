import { useMemo, useState } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { socialApi } from '@/features/social/api';
import { sand, ink } from '@/theme/colors';
import { EmptyState } from '@/components/common/EmptyState';

type Kind = 'all' | 'post' | 'article' | 'reel' | 'webinar';

type RepostItem = {
  kind: Exclude<Kind, 'all'>;
  repostedAt: string;
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

const TABS: { key: Kind; label: string }[] = [
  { key: 'all', label: 'Всё' },
  { key: 'article', label: 'Статьи' },
  { key: 'post', label: 'Посты' },
  { key: 'reel', label: 'Reels' },
  { key: 'webinar', label: 'Вебинары' },
];

export default function RepostsScreen() {
  const [kind, setKind] = useState<Kind>('all');

  const query = useQuery({
    queryKey: ['social', 'reposts', kind],
    queryFn: async () => {
      const res = (await socialApi.reposts.list({
        kind: kind === 'all' ? undefined : kind,
        limit: 50,
      })) as { items: RepostItem[] };
      return Array.isArray(res?.items) ? res.items : [];
    },
  });

  const items = query.data ?? [];

  const openItem = (it: RepostItem) => {
    if (it.kind === 'article' && it.data.slug) router.push(`/social/article/${it.data.slug}`);
    else if (it.kind === 'webinar' && it.data.slug) router.push(`/social/webinar/${it.data.slug}`);
    else if (it.kind === 'post') router.push(`/social/post/${it.data.id}`);
    else if (it.kind === 'reel') router.push('/reels');
  };

  const content = useMemo(() => {
    if (query.isLoading) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={ink.DEFAULT} />
        </View>
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          title="Пока нет репостов"
          subtitle="Нажмите ⇅ на любой карточке, чтобы добавить её сюда."
        />
      );
    }
    return (
      <FlatList
        data={items}
        keyExtractor={(it) => `${it.kind}-${it.data.id}`}
        renderItem={({ item }) => <RepostRow item={item} onPress={() => openItem(item)} />}
        ItemSeparatorComponent={() => (
          <View className="h-px bg-sand-2" style={{ marginLeft: 92 }} />
        )}
        contentContainerStyle={{ paddingVertical: 4 }}
      />
    );
  }, [items, query.isLoading]);

  return (
    <Screen>
      <Header title="Мои репосты" />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={TABS}
        keyExtractor={(t) => t.key}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}
        renderItem={({ item }) => {
          const active = item.key === kind;
          return (
            <AnimatedPressable
              onPress={() => setKind(item.key)}
              haptic="selection"
              scale={0.94}
            >
              <View
                className={`h-9 items-center justify-center rounded-pill px-4 ${
                  active ? 'bg-ink' : 'bg-sand-1'
                }`}
              >
                <Text
                  className={`text-[12px] font-bold ${active ? 'text-white' : 'text-ink/60'}`}
                  tracking="tight"
                >
                  {item.label}
                </Text>
              </View>
            </AnimatedPressable>
          );
        }}
      />
      {content}
    </Screen>
  );
}

function RepostRow({ item, onPress }: { item: RepostItem; onPress: () => void }) {
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
    <AnimatedPressable onPress={onPress} haptic="selection" scale={0.98}>
      <View className="flex-row items-center gap-3 px-4 py-3.5">
        <View className="h-16 w-16 overflow-hidden rounded-xl bg-sand-1">
          {cover ? (
            <Image
              source={{ uri: cover }}
              placeholder={blurhash ? { blurhash } : undefined}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={120}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="repeat" size={22} color={sand[4]} />
            </View>
          )}
        </View>
        <View className="flex-1">
          <Text variant="meta-upper" tracking="widest" className="text-greenman-7">
            {kindLabel}
          </Text>
          <Text numberOfLines={2} className="mt-0.5 text-[15px] font-semibold text-ink">
            {title}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={sand[4]} />
      </View>
    </AnimatedPressable>
  );
}
