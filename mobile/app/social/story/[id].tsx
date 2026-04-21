import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import { socialApi } from '@/features/social/api';

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [groups, setGroups] = useState<any[]>([]);
  const [flat, setFlat] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    socialApi.stories.active().then((g: any) => {
      const all: any[] = [];
      (Array.isArray(g) ? g : []).forEach((grp: any) => {
        (grp.stories || []).forEach((s: any) => all.push(s));
      });
      setGroups(g || []);
      setFlat(all);
      const i = all.findIndex((s) => String(s.id) === String(id));
      if (i >= 0) setIdx(i);
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    const cur = flat[idx];
    if (cur?.id) socialApi.stories.view(cur.id).catch(() => {});
    if (!flat.length) return;
    const t = setTimeout(() => next(), (cur?.durationSec || 7) * 1000);
    return () => clearTimeout(t);
  }, [idx, flat]);

  const next = () => {
    if (idx + 1 < flat.length) setIdx(idx + 1);
    else router.back();
  };
  const prev = () => setIdx(Math.max(0, idx - 1));

  const cur = flat[idx];
  if (!cur) return <Text style={{ padding: 12 }}>Загрузка…</Text>;

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      {cur.media?.type === 'video' ? (
        <Video source={{ uri: cur.media.url }} style={{ flex: 1 }} resizeMode={ResizeMode.COVER} shouldPlay isLooping={false} />
      ) : cur.media?.url ? (
        <Image source={{ uri: cur.media.url }} style={{ flex: 1 }} resizeMode="cover" />
      ) : null}
      <Pressable onPress={prev} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '30%' }} />
      <Pressable onPress={next} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '30%' }} />
      {cur.caption ? (
        <View style={{ position: 'absolute', bottom: 80, left: 16, right: 16 }}>
          <Text style={{ color: 'white', fontSize: 16 }}>{cur.caption}</Text>
        </View>
      ) : null}
    </View>
  );
}
