import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';

export default function StoryScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [flat, setFlat] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    socialApi.stories
      .active()
      .then((g: any) => {
        const all: any[] = [];
        (Array.isArray(g) ? g : []).forEach((grp: any) => {
          (grp.stories || []).forEach((s: any) => all.push(s));
        });
        setFlat(all);
        const i = all.findIndex((s) => String(s.id) === String(id));
        if (i >= 0) setIdx(i);
      })
      .catch(() => {});
  }, [id]);

  const next = () => {
    if (idx + 1 < flat.length) setIdx(idx + 1);
    else router.back();
  };
  const prev = () => setIdx(Math.max(0, idx - 1));

  useEffect(() => {
    const cur = flat[idx];
    if (cur?.id) socialApi.stories.view(cur.id).catch(() => {});
    if (!flat.length) return;
    const t = setTimeout(() => next(), (cur?.durationSec || 7) * 1000);
    return () => clearTimeout(t);
  }, [idx, flat]);

  const cur = flat[idx];

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      {!cur ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-white/60">Загрузка…</Text>
        </View>
      ) : (
        <>
          {cur.media?.type === 'video' ? (
            <Video
              source={{ uri: cur.media.url }}
              style={{ flex: 1 }}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping={false}
            />
          ) : cur.media?.url ? (
            <Image
              source={{ uri: cur.media.url }}
              style={{ flex: 1 }}
              resizeMode="cover"
            />
          ) : null}
          <Pressable
            onPress={prev}
            style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '30%' }}
          />
          <Pressable
            onPress={next}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '30%' }}
          />
          {cur.caption ? (
            <View
              style={{ position: 'absolute', bottom: 40 + insets.bottom, left: 16, right: 16 }}
            >
              <Text className="text-base text-white" numberOfLines={4}>
                {cur.caption}
              </Text>
            </View>
          ) : null}
        </>
      )}

      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Закрыть"
        style={{ position: 'absolute', top: insets.top + 8, right: 12 }}
        className="h-10 w-10 items-center justify-center rounded-full bg-black/40 active:opacity-70"
      >
        <Ionicons name="close" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}
