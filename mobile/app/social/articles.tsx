import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Shimmer } from '@/components/ui/Shimmer';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/common/EmptyState';
import { socialApi } from '@/features/social/api';
import { greenman, ink, sand } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

type Article = {
  id: number;
  slug: string;
  title: string;
  excerpt?: string | null;
  cover?: { url?: string | null; blurhash?: string | null } | null;
};

export default function ArticlesListScreen() {
  const [query, setQuery] = useState('');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['social', 'articles', 'public'],
    queryFn: async () => {
      const res = await socialApi.articles.list();
      return (Array.isArray(res) ? res : []) as Article[];
    },
  });

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = data ?? [];
    if (!q) return all;
    return all.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      String(item.excerpt ?? '').toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <Screen>
      <Header title="Статьи" />
      <View className="border-b border-border bg-white px-4 pb-3 pt-3">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск по статьям"
          leftIcon={<Ionicons name="search" size={18} color={ink[60]} />}
          rightIcon={query ? <Ionicons name="close-circle" size={18} color={ink[40]} /> : undefined}
          onRightIconPress={() => setQuery('')}
        />
      </View>

      {isLoading ? (
        <ArticleSkeleton />
      ) : isError ? (
        <EmptyState
          variant="error"
          title="Не удалось загрузить статьи"
          subtitle="Проверьте соединение и попробуйте снова."
          actionLabel="Повторить"
          onAction={() => refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={query ? 'Ничего не нашли' : 'Пока нет статей'}
          subtitle={query ? 'Попробуйте другой запрос.' : 'Новые материалы появятся здесь.'}
          actionLabel={query ? 'Очистить' : undefined}
          onAction={query ? () => setQuery('') : undefined}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
          renderItem={({ item }) => <ArticleRow item={item} />}
        />
      )}
    </Screen>
  );
}

function ArticleSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3].map((item) => (
        <View key={item} className="flex-row gap-3 rounded-lg bg-white p-3">
          <Shimmer style={{ width: 96, height: 96, borderRadius: 16 }} />
          <View className="flex-1 gap-2">
            <Shimmer style={{ height: 14, width: '40%', borderRadius: 8 }} />
            <Shimmer style={{ height: 18, width: '92%', borderRadius: 8 }} />
            <Shimmer style={{ height: 12, width: '80%', borderRadius: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ArticleRow({ item }: { item: Article }) {
  return (
    <AnimatedPressable
      onPress={() => router.push(`/social/article/${item.slug}`)}
      haptic="selection"
      scale={0.98}
      wrapperStyle={shadows.flat}
      className="rounded-lg bg-white p-3"
    >
      <View className="flex-row gap-3">
        <View className="h-24 w-24 overflow-hidden rounded-md bg-sand-1">
          {item.cover?.url ? (
            <Image
              source={{ uri: item.cover.url }}
              placeholder={item.cover.blurhash ? { blurhash: item.cover.blurhash } : undefined}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="newspaper-outline" size={24} color={sand[4]} />
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="meta-upper" tracking="wide" className="text-plum-3">
            Статья
          </Text>
          <Text numberOfLines={2} className="mt-1 text-[15px] font-semibold leading-[20px] text-ink">
            {item.title}
          </Text>
          {item.excerpt ? (
            <Text numberOfLines={2} className="mt-1 text-[13px] leading-[18px] text-ink/60">
              {item.excerpt}
            </Text>
          ) : null}
          <View className="mt-2 flex-row items-center gap-1">
            <Ionicons name="time-outline" size={13} color={greenman[7]} />
            <Text className="text-[11px] font-semibold text-greenman-7">Читать</Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}
