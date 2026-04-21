import React, { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, Text, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { socialApi } from '@/features/social/api';

export default function FeedScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const feed = await socialApi.feed({ limit: 30 });
      setItems(Array.isArray(feed) ? feed : feed.items || []);
      try {
        const s = await socialApi.stories.active();
        setStories(Array.isArray(s) ? s : []);
      } catch (_e) { /* ignore */ }
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openItem = (it: any) => {
    if (it.kind === 'article' && it.slug) router.push(`/social/article/${it.slug}`);
    else if (it.kind === 'webinar' && it.slug) router.push(`/social/webinar/${it.slug}`);
    else if (it.kind === 'reel') router.push('/reels');
    else if (it.kind === 'post') router.push(`/social/post/${it.id}`);
  };

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={items}
        keyExtractor={(it) => `${it.kind}-${it.id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={(
          <View>
            {stories.length > 0 && (
              <FlatList
                horizontal
                data={stories}
                keyExtractor={(g: any) => `${g.adminUserId}`}
                contentContainerStyle={{ padding: 12, gap: 12 }}
                renderItem={({ item: g }) => (
                  <Pressable onPress={() => router.push(`/social/story/${g.stories?.[0]?.id}`)}>
                    <View className="items-center">
                      {g.stories?.[0]?.media?.url ? (
                        <Image source={{ uri: g.stories[0].media.url }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#22c55e' }} />
                      ) : (
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#eee' }} />
                      )}
                    </View>
                  </Pressable>
                )}
              />
            )}
            <View className="flex-row px-3 pb-2 gap-2">
              <Pressable onPress={() => router.push('/reels')} className="px-3 py-1 bg-gray-100 rounded-full"><Text>Reels</Text></Pressable>
              <Pressable onPress={() => router.push('/social/articles')} className="px-3 py-1 bg-gray-100 rounded-full"><Text>Статьи</Text></Pressable>
              <Pressable onPress={() => router.push('/social/courses')} className="px-3 py-1 bg-gray-100 rounded-full"><Text>Курсы</Text></Pressable>
            </View>
            {error ? <Text style={{ color: 'red', padding: 12 }}>{error}</Text> : null}
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable onPress={() => openItem(item)} className="px-3 py-3 border-b border-gray-100">
            <Text style={{ fontSize: 12, color: '#888' }}>{item.kind}</Text>
            {item.title ? <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.title}</Text> : null}
            {item.text ? <Text numberOfLines={4}>{item.text}</Text> : null}
            {item.excerpt ? <Text numberOfLines={3} style={{ color: '#555' }}>{item.excerpt}</Text> : null}
            {item.cover?.url && (
              <Image source={{ uri: item.cover.url }} style={{ width: '100%', height: 180, marginTop: 8, borderRadius: 8 }} resizeMode="cover" />
            )}
          </Pressable>
        )}
        ListEmptyComponent={<Text className="p-4 text-gray-500">Лента пуста</Text>}
      />
    </View>
  );
}
