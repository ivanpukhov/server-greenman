import { View, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { socialApi } from '@/features/social/api';
import { ink, greenman, clay, sand, sun } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { EmptyState } from '@/components/common/EmptyState';
import { formatRelativeRu } from '@/lib/format/relativeTime';

type HomeworkItem = {
  id: number;
  text?: string | null;
  createdAt: string;
  reviewStatus?: string | null;
  reviewerComment?: string | null;
  day?: { id: number; dayNumber: number; title: string } | null;
  course?: { id: number; slug: string; title: string } | null;
};

type ReviewStatus = 'approved' | 'rejected' | 'pending';

function reviewConfig(status: string | null | undefined): {
  label: string;
  bg: string;
  dot: string;
  text: string;
} {
  const s = (status ?? 'pending') as ReviewStatus;
  if (s === 'approved') return { label: 'Принято', bg: 'bg-greenman-1', dot: greenman[7], text: 'text-greenman-9' };
  if (s === 'rejected') return { label: 'Отклонено', bg: 'bg-red-50', dot: '#b00020', text: 'text-red-700' };
  return { label: 'На проверке', bg: 'bg-sun-0', dot: sun[3], text: 'text-ink/70' };
}

export default function HomeworkScreen() {
  const query = useQuery({
    queryKey: ['social', 'profile', 'homework'],
    queryFn: async () => {
      const res = (await socialApi.profile.homework()) as { items: HomeworkItem[] };
      return Array.isArray(res?.items) ? res.items : [];
    },
  });
  const items = query.data ?? [];

  return (
    <Screen>
      <Header title="Домашние задания" />
      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={ink.DEFAULT} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          title="Ещё нет отчётов"
          subtitle="Пройдите день курса и отправьте отчёт — он появится здесь."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => <HomeworkRow item={item} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        />
      )}
    </Screen>
  );
}

function HomeworkRow({ item }: { item: HomeworkItem }) {
  const cfg = reviewConfig(item.reviewStatus);

  const openDay = () => {
    if (item.course?.slug && item.day?.dayNumber) {
      router.push(`/social/course/${item.course.slug}/day/${item.day.dayNumber}`);
    }
  };

  return (
    <AnimatedPressable onPress={openDay} haptic="selection" wrapperStyle={shadows.flat}>
      <View className="overflow-hidden rounded-xl bg-white p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[12px] text-ink/50" tracking="tight">
            {formatRelativeRu(item.createdAt)}
          </Text>
          <View className={`flex-row items-center rounded-pill ${cfg.bg} px-3 py-1`}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: cfg.dot,
                marginRight: 6,
              }}
            />
            <Text className={`text-[11px] font-bold ${cfg.text}`} tracking="wide">
              {cfg.label}
            </Text>
          </View>
        </View>

        {item.course?.title ? (
          <Text variant="meta-upper" tracking="widest" className="mt-2.5 text-greenman-7">
            {item.course.title}
          </Text>
        ) : null}

        {item.day ? (
          <Text
            className="mt-1 text-ink"
            style={{ fontFamily: 'SourceSerifPro_700Bold', fontSize: 17, lineHeight: 22 }}
          >
            День {item.day.dayNumber}: {item.day.title}
          </Text>
        ) : null}

        {item.text ? (
          <Text
            className="mt-2 text-[14px] text-ink/70"
            numberOfLines={3}
            tracking="tight"
          >
            {item.text}
          </Text>
        ) : null}

        {item.reviewerComment ? (
          <View className="mt-3 rounded-lg bg-greenman-0 p-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="chatbubble" size={13} color={greenman[7]} />
              <Text className="text-[11px] font-bold text-greenman-8" tracking="wide">
                Куратор
              </Text>
            </View>
            <Text className="mt-1 text-[13px] text-greenman-9" tracking="tight">
              {item.reviewerComment}
            </Text>
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}
