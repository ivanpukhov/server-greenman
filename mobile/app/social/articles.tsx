import React, { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { socialApi } from '@/features/social/api';

export default function ArticlesListScreen() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { socialApi.articles.list().then(setItems).catch(() => {}); }, []);
  return (
    <FlatList
      data={items}
      keyExtractor={(a) => String(a.id)}
      ListHeaderComponent={<Text className="text-xl font-bold p-3">Статьи</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/social/article/${item.slug}`)} className="p-3 border-b border-gray-100">
          {item.cover?.url && <Image source={{ uri: item.cover.url }} style={{ width: '100%', height: 160, borderRadius: 8 }} />}
          <Text className="text-lg font-semibold mt-2">{item.title}</Text>
          {item.excerpt ? <Text numberOfLines={3} className="text-gray-600 mt-1">{item.excerpt}</Text> : null}
        </Pressable>
      )}
    />
  );
}
