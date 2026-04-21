import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import BlockRenderer from '@/features/social/BlockRenderer';

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      socialApi.articles
        .get(slug)
        .then(setData)
        .catch((e) => setError(e?.message ?? 'Ошибка загрузки'));
    }
  }, [slug]);

  return (
    <Screen>
      <Header title={data?.title ?? 'Статья'} />
      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-red-500">{error}</Text>
        </View>
      ) : !data ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-ink-dim">Загрузка…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
          {data.cover?.url ? (
            <Image
              source={{ uri: data.cover.url }}
              style={{ width: '100%', height: 220, borderRadius: 12 }}
              contentFit="cover"
              transition={150}
            />
          ) : null}
          <Text className="text-2xl font-display text-ink">{data.title}</Text>
          {data.excerpt ? (
            <Text className="text-base text-ink-dim">{data.excerpt}</Text>
          ) : null}
          <BlockRenderer blocks={data.blocks} />
        </ScrollView>
      )}
    </Screen>
  );
}
