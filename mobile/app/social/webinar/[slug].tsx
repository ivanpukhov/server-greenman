import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
import { socialApi } from '@/features/social/api';
import BlockRenderer from '@/features/social/BlockRenderer';

export default function WebinarScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  useEffect(() => { if (slug) socialApi.webinars.get(slug).then(setData).catch(() => {}); }, [slug]);
  if (!data) return <Text style={{ padding: 12 }}>Загрузка…</Text>;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>{data.title}</Text>
      {data.video?.url && (
        <Video source={{ uri: data.video.url }} style={{ width: '100%', height: 220, borderRadius: 8 }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
      )}
      <BlockRenderer blocks={data.descriptionBlocks} />
      {Array.isArray(data.attachments) && data.attachments.length > 0 && (
        <View>
          <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 8 }}>Файлы</Text>
          {data.attachments.map((a: any) => (
            <Pressable key={a.id} onPress={() => Linking.openURL(a.url)}>
              <Text style={{ color: '#1a56db' }}>📎 {a.originalName}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
