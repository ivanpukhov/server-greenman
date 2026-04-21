import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { socialApi } from '@/features/social/api';
import BlockRenderer from '@/features/social/BlockRenderer';
import { greenman } from '@/theme/colors';

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
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
  }, [slug]);

  const enroll = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const res = await socialApi.courses.enroll(data.id);
      if (res.requiresPayment) {
        Alert.alert(
          'Платный курс',
          `Стоимость: ${(res.priceCents / 100).toLocaleString('ru-RU')} ${res.currency}. Админ отправит ссылку на оплату.`
        );
      }
      await load();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось записаться');
    } finally {
      setBusy(false);
    }
  };

  const isEnrolled = !!data?.enrollment && !!data.enrollment.startedAt;

  return (
    <Screen>
      <Header title={data?.title ?? 'Курс'} />
      {!data ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-ink-dim">Загрузка…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
          {data.trailer?.url ? (
            <Video
              source={{ uri: data.trailer.url }}
              style={{ width: '100%', height: 220, borderRadius: 12 }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          ) : data.cover?.url ? (
            <Image
              source={{ uri: data.cover.url }}
              style={{ width: '100%', height: 220, borderRadius: 12 }}
              contentFit="cover"
              transition={150}
            />
          ) : null}
          <Text className="text-2xl font-display text-ink">{data.title}</Text>
          {data.shortDescription ? (
            <Text className="text-base text-ink-dim">{data.shortDescription}</Text>
          ) : null}
          <Text className="text-base font-bold text-greenman-8">
            {data.priceCents > 0
              ? `${(data.priceCents / 100).toLocaleString('ru-RU')} ${data.currency}`
              : 'Бесплатно'}{' '}
            · {data.durationDays} дн.
          </Text>
          <BlockRenderer blocks={data.descriptionBlocks} />
          {!isEnrolled ? (
            <Button
              label={data.priceCents > 0 ? 'Записаться (платно)' : 'Записаться'}
              onPress={enroll}
              loading={busy}
              size="lg"
            />
          ) : null}
          {days ? (
            <View className="mt-2">
              <Text className="text-lg font-bold text-ink">Программа</Text>
              <View className="mt-2 overflow-hidden rounded-xl border border-border bg-white">
                {days.days.map((d: any, idx: number) => (
                  <Pressable
                    key={d.id || d.dayNumber}
                    disabled={d.locked}
                    onPress={() =>
                      router.push(`/social/course/${slug}/day/${d.dayNumber}`)
                    }
                    className={`flex-row items-center gap-3 p-3 ${idx === days.days.length - 1 ? '' : 'border-b border-border'} active:bg-greenman-0`}
                  >
                    <Ionicons
                      name={d.locked ? 'lock-closed-outline' : 'play-circle-outline'}
                      size={20}
                      color={d.locked ? '#94a3b8' : greenman[7]}
                    />
                    <Text
                      className={`flex-1 text-sm ${d.locked ? 'text-ink-dim' : 'text-ink'}`}
                      numberOfLines={2}
                    >
                      День {d.dayNumber}: {d.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
