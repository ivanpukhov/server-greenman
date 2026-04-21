import { useEffect, useState } from 'react';
import { FlatList, Pressable, View, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode } from 'expo-av';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';

const { height: SCREEN_H } = Dimensions.get('window');

type Reel = {
  id: number;
  description?: string | null;
  video?: { url?: string | null } | null;
};

export default function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Reel[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    socialApi.reels
      .list({ limit: 20 })
      .then((r) => setItems(Array.isArray(r) ? (r as Reel[]) : []))
      .catch(() => {});
  }, []);

  const onViewable = ({ viewableItems }: any) => {
    const first = viewableItems?.[0]?.index;
    if (typeof first === 'number') {
      setActive(first);
      const it = items[first];
      if (it?.id) socialApi.reels.view(it.id).catch(() => {});
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        pagingEnabled
        snapToInterval={SCREEN_H}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        ListEmptyComponent={
          <View style={{ height: SCREEN_H }} className="items-center justify-center">
            <Text className="text-sm text-white/60">Пока нет Reels</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={{ height: SCREEN_H, justifyContent: 'center' }}>
            {item.video?.url ? (
              <Video
                source={{ uri: item.video.url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode={ResizeMode.COVER}
                shouldPlay={index === active}
                isLooping
                isMuted={false}
              />
            ) : null}
            <View
              style={{ position: 'absolute', bottom: 80 + insets.bottom, left: 16, right: 16 }}
            >
              {item.description ? (
                <Text className="text-sm text-white" numberOfLines={4}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      />

      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/feed'))}
        accessibilityRole="button"
        accessibilityLabel="Назад"
        style={{ position: 'absolute', top: insets.top + 8, left: 12 }}
        className="h-10 w-10 items-center justify-center rounded-full bg-black/40 active:opacity-70"
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}
