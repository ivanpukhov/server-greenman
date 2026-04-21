import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { socialApi } from '@/features/social/api';
import BlockRenderer from '@/features/social/BlockRenderer';

export default function CourseScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!slug) return;
    try {
      const c = await socialApi.courses.get(slug);
      setData(c);
      const d = await socialApi.courses.days(slug);
      setDays(d);
    } catch (_e) { /* ignore */ }
  };
  useEffect(() => { load(); }, [slug]);

  const enroll = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const res = await socialApi.courses.enroll(data.id);
      if (res.requiresPayment) {
        Alert.alert('Платный курс', `Стоимость: ${(res.priceCents / 100).toLocaleString()} ${res.currency}. Админ отправит ссылку на оплату.`);
      }
      await load();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <Text style={{ padding: 12 }}>Загрузка…</Text>;
  const isEnrolled = !!data.enrollment && !!data.enrollment.startedAt;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {data.trailer?.url ? (
        <Video source={{ uri: data.trailer.url }} style={{ width: '100%', height: 220 }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
      ) : data.cover?.url ? (
        <Image source={{ uri: data.cover.url }} style={{ width: '100%', height: 220, borderRadius: 8 }} />
      ) : null}
      <Text style={{ fontSize: 24, fontWeight: '700' }}>{data.title}</Text>
      <Text style={{ color: '#555' }}>{data.shortDescription}</Text>
      <Text style={{ fontWeight: '600' }}>
        {data.priceCents > 0 ? `${(data.priceCents / 100).toLocaleString()} ${data.currency}` : 'Бесплатно'} · {data.durationDays} дней
      </Text>
      <BlockRenderer blocks={data.descriptionBlocks} />
      {!isEnrolled && (
        <Pressable disabled={busy} onPress={enroll} className="bg-green-600 py-3 rounded-lg items-center">
          <Text className="text-white font-semibold">{data.priceCents > 0 ? 'Записаться (платно)' : 'Записаться'}</Text>
        </Pressable>
      )}
      {days && (
        <View>
          <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 8 }}>Программа</Text>
          {days.days.map((d: any) => (
            <Pressable
              key={d.id || d.dayNumber}
              disabled={d.locked}
              onPress={() => router.push(`/social/course/${slug}/day/${d.dayNumber}`)}
              style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}
            >
              <Text style={{ color: d.locked ? '#999' : '#111' }}>
                {d.locked ? '🔒 ' : ''}День {d.dayNumber}: {d.title}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
