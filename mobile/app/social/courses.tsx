import React, { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { socialApi } from '@/features/social/api';

export default function CoursesListScreen() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { socialApi.courses.list().then(setItems).catch(() => {}); }, []);
  return (
    <FlatList
      data={items}
      keyExtractor={(c) => String(c.id)}
      ListHeaderComponent={(
        <View className="p-3">
          <Text className="text-xl font-bold">Курсы</Text>
          <Pressable onPress={() => router.push('/social/my-courses')} className="mt-2">
            <Text className="text-blue-600">→ Мои курсы</Text>
          </Pressable>
        </View>
      )}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/social/course/${item.slug}`)} className="p-3 border-b border-gray-100">
          {item.cover?.url && <Image source={{ uri: item.cover.url }} style={{ width: '100%', height: 160, borderRadius: 8 }} />}
          <Text className="text-lg font-semibold mt-2">{item.title}</Text>
          {item.shortDescription ? <Text className="text-gray-600 mt-1">{item.shortDescription}</Text> : null}
          <Text className="mt-1 font-semibold">
            {item.priceCents > 0 ? `${(item.priceCents / 100).toLocaleString()} ${item.currency}` : 'Бесплатно'} · {item.durationDays} дней
          </Text>
        </Pressable>
      )}
    />
  );
}
