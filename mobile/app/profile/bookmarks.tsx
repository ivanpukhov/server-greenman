import { useMemo, useState } from 'react';
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

type Kind = 'all' | 'post' | 'article' | 'reel' | 'webinar' | 'course';

type BookmarkItem = {
  kind: Exclude<Kind, 'all'>;
  bookmarkedAt: string;
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
  { key: 'course', label: 'Курсы' },
];

export default function BookmarksScreen() {
  const [kind, setKind] = useState<Kind>('all');

  const query = useQuery({
    queryKey: ['social', 'bookmarks', kind],
    queryFn: async () => {
      const res = (await socialApi.bookmarks.list({
        kind: kind === 'all' ? undefined : kind,
        limit: 50,
      })) as { items: BookmarkItem[] };
      return Array.isArray(res?.items) ? res.items : [];
    },
  });

  const items = query.data ?? [];

  const openItem = (it: BookmarkItem) => {
    if (it.kind === 'article' && it.data.slug) router.push(`/social/article/${it.data.slug}`);
    else if (it.kind === 'webinar' && it.data.slug) router.push(`/social/webinar/${it.data.slug}`);
    else if (it.kind === 'course' && it.data.slug) router.push(`/social/course/${it.data.slug}`);
    else if (it.kind === 'post') router.push(`/social/post/${it.data.id}`);
    else if (it.kind === 'reel') router.push('/reels');
  };

  const content = useMemo(() => {
    if (query.isLoading) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={greenman[7]} />
        </View>
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          title="Пока ничего не сохранено"
          subtitle="Нажмите закладку на любой карточке, чтобы вернуться к ней позже."
        />
      );
    }
    return (
      <FlatList
        data={items}
        keyExtractor={(it) => `${it.kind}-${it.data.id}`}
        renderItem={({ item }) => <BookmarkRow item={item} onPress={() => openItem(item)} />}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: semantic.border, marginLeft: 92 }} />
        )}
        contentContainerStyle={{ paddingVertical: spacing.xs }}
      />
    );
  }, [items, query.isLoading]);

  return (
    <Screen>
      <Header title="Сохранённое" />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={TABS}
        keyExtractor={(t) => t.key}
        contentContainerStyle={{
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
        }}
        renderItem={({ item }) => {
          const active = item.key === kind;
          return (
            <Pressable
              onPress={() => setKind(item.key)}
              accessibilityRole="button"
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: radii.full,
                backgroundColor: active ? greenman[7] : semantic.surfaceSunken,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Manrope_600SemiBold',
                  fontSize: 13,
                  color: active ? '#fff' : semantic.ink,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
      {content}
    </Screen>
  );
}

function BookmarkRow({ item, onPress }: { item: BookmarkItem; onPress: () => void }) {
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
      : item.kind === 'webinar'
      ? 'Вебинар'
      : 'Курс';

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
            <Ionicons name="bookmark" size={22} color={semantic.inkMuted} />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: 'Manrope_500Medium',
            fontSize: 11,
            color: greenman[7],
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          {kindLabel}
        </Text>
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
