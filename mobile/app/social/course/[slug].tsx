import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { StickyCTA } from '@/components/ui/StickyCTA';
import { Shimmer } from '@/components/ui/Shimmer';
import { socialApi } from '@/features/social/api';
import BlockRenderer from '@/features/social/BlockRenderer';
import { greenman, ink, plum, sand } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

function priceLabel(data: any) {
  return data?.priceCents > 0
    ? `${(data.priceCents / 100).toLocaleString('ru-RU')} ${data.currency}`
    : 'Бесплатно';
}

export default function CourseScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const course = await socialApi.courses.get(slug);
      setData(course);
      const courseDays = await socialApi.courses.days(slug);
      setDays(courseDays);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
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
          `Стоимость: ${(res.priceCents / 100).toLocaleString('ru-RU')} ${res.currency}. Админ отправит ссылку на оплату.`,
        );
      }
      await load();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось записаться');
    } finally {
      setBusy(false);
    }
  };

  const isEnrolled = !!data?.enrollment?.startedAt;
  const firstOpenDay = days?.days?.find((day: any) => !day.locked) ?? days?.days?.[0];

  if (loading) {
    return (
      <Screen>
        <Header title="Курс" />
        <View className="gap-4 p-4">
          <Shimmer style={{ height: 260, borderRadius: 28 }} />
          <Shimmer style={{ height: 28, width: '80%', borderRadius: 10 }} />
          <Shimmer style={{ height: 16, width: '55%', borderRadius: 8 }} />
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <Header title="Курс" />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cloud-offline-outline" size={40} color={sand[4]} />
          <Text className="mt-4 text-center text-[15px] text-ink/60">Не удалось загрузить курс</Text>
          <Button label="Повторить" className="mt-5" onPress={load} />
        </View>
      </Screen>
    );
  }

  const startCourse = () => {
    if (!isEnrolled) {
      enroll();
      return;
    }
    if (firstOpenDay?.dayNumber) {
      router.push(`/social/course/${slug}/day/${firstOpenDay.dayNumber}`);
    }
  };

  return (
    <Screen edges={['left', 'right']}>
      <Header title={data.title ?? 'Курс'} transparent floating />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 132 }}
      >
        <View className="h-[300px] bg-ink">
          {data.trailer?.url ? (
            <Video
              source={{ uri: data.trailer.url }}
              style={{ width: '100%', height: '100%' }}
              useNativeControls
              resizeMode={ResizeMode.COVER}
            />
          ) : data.cover?.url ? (
            <Image
              source={{ uri: data.cover.url }}
              placeholder={data.cover.blurhash ? { blurhash: data.cover.blurhash } : undefined}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={180}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="school-outline" size={52} color="#fff" />
            </View>
          )}
          <View className="absolute inset-0 bg-black/30" />
          <View className="absolute bottom-0 left-0 right-0 p-5">
            <Text variant="meta-upper" tracking="wide" className="text-white/80">
              Курс · {priceLabel(data)}
            </Text>
            <Text numberOfLines={3} className="mt-1 font-display text-[28px] leading-[34px] text-white">
              {data.title}
            </Text>
            <Text className="mt-2 text-[13px] font-semibold text-white/80">
              {days?.days?.length ?? 0} уроков · {data.durationDays} дней
            </Text>
          </View>
        </View>

        <View className="px-5 pt-6">
          {data.shortDescription ? (
            <Text className="text-[15px] leading-[22px] text-ink/70">
              {data.shortDescription}
            </Text>
          ) : null}

          <View className="mt-5 rounded-lg bg-plum-0 p-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles-outline" size={18} color={plum[3]} />
              <Text className="text-[13px] font-semibold text-ink">Формат курса</Text>
            </View>
            <Text className="mt-2 text-[13px] leading-[18px] text-ink/70">
              Уроки открываются по программе. Домашние задания и прогресс сохраняются в профиле.
            </Text>
          </View>

          {data.descriptionBlocks ? (
            <View className="mt-6">
              <BlockRenderer blocks={data.descriptionBlocks} />
            </View>
          ) : null}

          {days?.days?.length ? (
            <View className="mt-8">
              <Text className="font-display text-[22px] leading-[28px] text-ink">Программа</Text>
              <View className="mt-3 gap-2">
                {days.days.map((day: any) => (
                  <AnimatedPressable
                    key={day.id || day.dayNumber}
                    disabled={day.locked}
                    onPress={() => router.push(`/social/course/${slug}/day/${day.dayNumber}`)}
                    haptic="selection"
                    wrapperStyle={shadows.flat}
                    className={`min-h-20 flex-row items-center rounded-md bg-white p-3 ${day.locked ? 'opacity-50' : ''}`}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: day.completed ? greenman[7] : greenman[0] }}
                    >
                      <Text className={`text-[13px] font-bold ${day.completed ? 'text-white' : 'text-greenman-7'}`}>
                        {day.completed ? '✓' : day.dayNumber}
                      </Text>
                    </View>
                    <View className="ml-3 min-w-0 flex-1">
                      <Text className="text-[13px] font-semibold leading-[18px] text-ink" numberOfLines={2}>
                        {day.title}
                      </Text>
                      <Text className="mt-0.5 text-[11px] text-ink/50">Урок {day.dayNumber}</Text>
                    </View>
                    <Ionicons
                      name={day.locked ? 'lock-closed-outline' : 'chevron-forward'}
                      size={18}
                      color={day.locked ? ink[40] : greenman[7]}
                    />
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <StickyCTA>
        <Button
          label={isEnrolled ? `Продолжить с урока ${firstOpenDay?.dayNumber ?? 1}` : 'Начать курс'}
          size="lg"
          full
          loading={busy}
          onPress={startCourse}
          iconRight={<Ionicons name="arrow-forward" size={18} color="#fff" />}
        />
      </StickyCTA>
    </Screen>
  );
}
