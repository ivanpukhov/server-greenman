import React, { useEffect, useState } from 'react';
import { FlatList, Text, View, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { socialApi } from '@/features/social/api';

const { height: SCREEN_H } = Dimensions.get('window');

export default function ReelsScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    socialApi.reels.list({ limit: 20 }).then((r) => setItems(Array.isArray(r) ? r : [])).catch(() => {});
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
            <View style={{ position: 'absolute', bottom: 80, left: 16, right: 16 }}>
              <Text style={{ color: 'white', fontSize: 14 }}>{item.description}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
