import React, { useEffect, useState } from 'react';
import { FlatList, Image, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { socialApi } from '@/features/social/api';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<any>(null);
  useEffect(() => { if (id) socialApi.posts.get(parseInt(id, 10)).then(setPost).catch(() => {}); }, [id]);
  if (!post) return <Text style={{ padding: 12 }}>Загрузка…</Text>;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ color: '#888' }}>{post.publishedAt ? new Date(post.publishedAt).toLocaleString() : ''}</Text>
      <Text style={{ fontSize: 16, lineHeight: 22 }}>{post.text}</Text>
      {Array.isArray(post.media) && post.media.map((m: any) => (
        m.type === 'image' ? <Image key={m.id} source={{ uri: m.url }} style={{ width: '100%', height: 240, borderRadius: 8 }} /> : null
      ))}
    </ScrollView>
  );
}
