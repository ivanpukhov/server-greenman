import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import BlockRenderer from '@/features/social/BlockRenderer';
import { greenman } from '@/theme/colors';

export default function WebinarScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      socialApi.webinars
        .get(slug)
        .then(setData)
        .catch((e) => setError(e?.message ?? 'Ошибка загрузки'));
    }
  }, [slug]);

  return (
    <Screen>
      <Header title={data?.title ?? 'Вебинар'} />
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
          <Text className="text-2xl font-display text-ink">{data.title}</Text>
          {data.video?.url ? (
            <Video
              source={{ uri: data.video.url }}
              style={{ width: '100%', height: 220, borderRadius: 12 }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          ) : null}
          <BlockRenderer blocks={data.descriptionBlocks} />
          {Array.isArray(data.attachments) && data.attachments.length > 0 ? (
            <View className="mt-2 gap-2">
              <Text className="text-lg font-bold text-ink">Файлы</Text>
              {data.attachments.map((a: any) => (
                <Pressable
                  key={a.id}
                  onPress={() => Linking.openURL(a.url).catch(() => {})}
                  accessibilityRole="link"
                  accessibilityLabel={a.originalName}
                  className="flex-row items-center gap-2 rounded-xl border border-border bg-white p-3 active:opacity-70"
                >
                  <Ionicons name="document-attach-outline" size={18} color={greenman[7]} />
                  <Text className="flex-1 text-sm text-ink" numberOfLines={1}>
                    {a.originalName}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
