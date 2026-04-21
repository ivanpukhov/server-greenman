import React, { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { socialApi } from '@/features/social/api';

export default function MyCoursesScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { socialApi.courses.mine().then(setItems).catch((e) => setError(e.message)); }, []);
  if (error) return <Text style={{ color: 'red', padding: 12 }}>{error}</Text>;
  return (
    <FlatList
      data={items}
      keyExtractor={(e) => String(e.id)}
      ListHeaderComponent={<Text className="text-xl font-bold p-3">Мои курсы</Text>}
      ListEmptyComponent={<Text className="p-4 text-gray-500">Пока нет записей</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/social/course/${item.course?.slug}`)} className="p-3 border-b border-gray-100">
          {item.course?.cover?.url && <Image source={{ uri: item.course.cover.url }} style={{ width: '100%', height: 140, borderRadius: 8 }} />}
          <Text className="text-lg font-semibold mt-2">{item.course?.title}</Text>
          <Text className="text-gray-600">Открыто дней: {item.unlockedUpTo}/{item.course?.durationDays}</Text>
          <Text className="text-gray-600">Статус: {item.status}</Text>
        </Pressable>
      )}
    />
  );
}
