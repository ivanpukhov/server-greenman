import React, { useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { socialApi } from '@/features/social/api';
import BlockRenderer from '@/features/social/BlockRenderer';

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (slug) socialApi.articles.get(slug).then(setData).catch((e) => setError(e.message)); }, [slug]);
  if (error) return <Text style={{ color: 'red', padding: 12 }}>{error}</Text>;
  if (!data) return <Text style={{ padding: 12 }}>Загрузка…</Text>;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {data.cover?.url && <Image source={{ uri: data.cover.url }} style={{ width: '100%', height: 220, borderRadius: 8 }} />}
      <Text style={{ fontSize: 24, fontWeight: '700' }}>{data.title}</Text>
      {data.excerpt ? <Text style={{ color: '#666' }}>{data.excerpt}</Text> : null}
      <BlockRenderer blocks={data.blocks} />
    </ScrollView>
  );
}
