import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      socialApi.posts
        .get(parseInt(id, 10))
        .then(setPost)
        .catch((e) => setError(e?.message ?? 'Ошибка загрузки'));
    }
  }, [id]);

  return (
    <Screen>
      <Header title="Пост" />
      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-red-500">{error}</Text>
        </View>
      ) : !post ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-ink-dim">Загрузка…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
          {post.publishedAt ? (
            <Text className="text-xs text-ink-dim">
              {new Date(post.publishedAt).toLocaleString('ru-RU')}
            </Text>
          ) : null}
          {post.text ? (
            <Text className="text-base text-ink leading-6">{post.text}</Text>
          ) : null}
          {Array.isArray(post.media)
            ? post.media.map((m: any) =>
                m.type === 'image' ? (
                  <Image
                    key={m.id}
                    source={{ uri: m.url }}
                    style={{ width: '100%', height: 240, borderRadius: 12 }}
                    contentFit="cover"
                    transition={150}
                  />
                ) : null
              )
            : null}
        </ScrollView>
      )}
    </Screen>
  );
}
