import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Shimmer } from '@/components/ui/Shimmer';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/common/EmptyState';
import { socialApi } from '@/features/social/api';
import { greenman, ink, plum, sand } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

type Tab = 'all' | 'mine';

type Course = {
  id: number;
  slug: string;
  title: string;
  shortDescription?: string | null;
  cover?: { url?: string | null; blurhash?: string | null } | null;
  priceCents: number;
  currency: string;
  durationDays: number;
  enrollment?: { startedAt?: string | null; progress?: number | null } | null;
};

export default function CoursesListScreen() {
  const [tab, setTab] = useState<Tab>('all');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['social', 'courses', 'public'],
    queryFn: async () => {
      const res = await socialApi.courses.list();
      return (Array.isArray(res) ? res : []) as Course[];
    },
  });

  const items = useMemo(() => {
    const all = data ?? [];
    return tab === 'mine' ? all.filter((course) => !!course.enrollment?.startedAt) : all;
  }, [data, tab]);

  const featured = items[0];
  const gridItems = featured ? items.slice(1) : items;

  return (
    <Screen>
      <Header
        title="Курсы"
        rightAction={
          <IconButton
            icon={<Ionicons name="bookmark-outline" size={20} color={greenman[7]} />}
            onPress={() => router.push('/social/my-courses')}
            accessibilityLabel="Мои курсы"
          />
        }
      />

      <View className="border-b border-border bg-background px-4 py-3">
        <View className="flex-row gap-2">
          <Chip label="Все" selected={tab === 'all'} onPress={() => setTab('all')} tone="primary" />
          <Chip label="Мои" selected={tab === 'mine'} onPress={() => setTab('mine')} tone="primary" />
        </View>
      </View>

      {isLoading ? (
        <CourseSkeleton />
      ) : isError ? (
        <EmptyState
          variant="error"
          title="Не удалось загрузить курсы"
          subtitle="Проверьте соединение и попробуйте снова."
          actionLabel="Повторить"
          onAction={() => refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={tab === 'mine' ? 'Вы не записаны на курсы' : 'Пока нет курсов'}
          subtitle={tab === 'mine' ? 'Откройте каталог курсов и начните первый урок.' : 'Новые курсы появятся здесь.'}
          actionLabel={tab === 'mine' ? 'Все курсы' : undefined}
          onAction={tab === 'mine' ? () => setTab('all') : undefined}
        />
      ) : (
        <FlatList
          data={gridItems}
          keyExtractor={(course) => String(course.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}
          ListHeaderComponent={featured ? <FeaturedCourse course={featured} /> : null}
          renderItem={({ item }) => <CourseCard course={item} />}
        />
      )}
    </Screen>
  );
}

function priceLabel(course: Course) {
  return course.priceCents > 0
    ? `${(course.priceCents / 100).toLocaleString('ru-RU')} ${course.currency || '₸'}`
    : 'Бесплатно';
}

function CourseSkeleton() {
  return (
    <View className="gap-4 p-4">
      <Shimmer style={{ height: 200, borderRadius: 24 }} />
      <View className="flex-row gap-3">
        <Shimmer style={{ flex: 1, aspectRatio: 0.78, borderRadius: 22 }} />
        <Shimmer style={{ flex: 1, aspectRatio: 0.78, borderRadius: 22 }} />
      </View>
    </View>
  );
}

function FeaturedCourse({ course }: { course: Course }) {
  return (
    <AnimatedPressable
      onPress={() => router.push(`/social/course/${course.slug}`)}
      haptic="selection"
      scale={0.98}
      className="mb-5 h-[200px] overflow-hidden rounded-xl bg-ink"
      wrapperStyle={shadows.card}
    >
      {course.cover?.url ? (
        <Image
          source={{ uri: course.cover.url }}
          placeholder={course.cover.blurhash ? { blurhash: course.cover.blurhash } : undefined}
          style={{ position: 'absolute', inset: 0 }}
          contentFit="cover"
          transition={180}
        />
      ) : null}
      <View className="absolute inset-0 bg-black/35" />
      <View className="flex-1 justify-end p-5">
        <Text variant="meta-upper" tracking="wide" className="text-white/80">
          Курс · {priceLabel(course)}
        </Text>
        <Text numberOfLines={2} className="mt-1 font-display text-[22px] leading-[28px] text-white">
          {course.title}
        </Text>
        <Text className="mt-1 text-[13px] font-medium text-white/80">
          {course.durationDays} дней
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function CourseCard({ course }: { course: Course }) {
  const enrolled = !!course.enrollment?.startedAt;

  return (
    <AnimatedPressable
      onPress={() => router.push(`/social/course/${course.slug}`)}
      haptic="selection"
      scale={0.98}
      wrapperStyle={[{ flex: 1 }, shadows.flat]}
      className="flex-1 overflow-hidden rounded-lg bg-white"
    >
      <View className="aspect-[4/3] bg-sand-1">
        {course.cover?.url ? (
          <Image
            source={{ uri: course.cover.url }}
            placeholder={course.cover.blurhash ? { blurhash: course.cover.blurhash } : undefined}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="school-outline" size={28} color={sand[4]} />
          </View>
        )}
        <View className="absolute left-2 top-2 rounded-pill bg-plum-3 px-2 py-1">
          <Text className="text-[10px] font-bold text-white">{priceLabel(course)}</Text>
        </View>
      </View>
      <View className="p-3">
        <Text numberOfLines={2} className="text-[15px] font-semibold leading-[20px] text-ink">
          {course.title}
        </Text>
        <Text className="mt-1 text-[11px] text-ink/60">{course.durationDays} дней</Text>
        {enrolled ? (
          <View className="mt-3 h-1 overflow-hidden rounded-pill bg-ink/10">
            <View
              className="h-full rounded-pill bg-plum-3"
              style={{ width: `${Math.max(8, Math.min(100, course.enrollment?.progress ?? 15))}%` }}
            />
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}
