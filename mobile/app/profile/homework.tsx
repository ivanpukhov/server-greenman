import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import { semantic, greenman } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
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
          <ActivityIndicator color={greenman[7]} />
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
          contentContainerStyle={{
            padding: spacing.md,
            gap: spacing.sm,
            paddingBottom: spacing['3xl'],
          }}
        />
      )}
    </Screen>
  );
}

function HomeworkRow({ item }: { item: HomeworkItem }) {
  const status = item.reviewStatus;
  const statusLabel =
    status === 'approved' ? 'Принято' : status === 'rejected' ? 'Отклонено' : 'На проверке';
  const statusBg =
    status === 'approved' ? greenman[1] : status === 'rejected' ? '#FDE2E2' : '#FEF0DB';
  const statusColor =
    status === 'approved' ? greenman[8] : status === 'rejected' ? '#B02A37' : '#8A5A10';

  const openDay = () => {
    if (item.course?.slug && item.day?.dayNumber) {
      router.push(`/social/course/${item.course.slug}/day/${item.day.dayNumber}`);
    }
  };

  return (
    <Pressable
      onPress={openDay}
      style={{
        borderWidth: 1,
        borderColor: semantic.border,
        backgroundColor: semantic.surface,
        borderRadius: radii.lg,
        padding: spacing.md,
        gap: 6,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 12,
            color: semantic.inkDim,
          }}
        >
          {formatRelativeRu(item.createdAt)}
        </Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: radii.full,
            backgroundColor: statusBg,
          }}
        >
          <Text
            style={{
              fontFamily: 'Manrope_600SemiBold',
              fontSize: 11,
              color: statusColor,
            }}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      {item.course?.title ? (
        <Text
          style={{
            fontFamily: 'Manrope_500Medium',
            fontSize: 11,
            color: greenman[7],
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          {item.course.title}
        </Text>
      ) : null}
      {item.day ? (
        <Text
          style={{
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            color: semantic.ink,
          }}
        >
          День {item.day.dayNumber}: {item.day.title}
        </Text>
      ) : null}
      {item.text ? (
        <Text
          style={{
            fontFamily: 'Manrope_500Medium',
            fontSize: 14,
            color: semantic.ink,
            marginTop: 2,
          }}
          numberOfLines={3}
        >
          {item.text}
        </Text>
      ) : null}
      {item.reviewerComment ? (
        <Text
          style={{
            fontFamily: 'Manrope_500Medium',
            fontSize: 13,
            color: greenman[8],
            marginTop: 4,
          }}
        >
          Куратор: {item.reviewerComment}
        </Text>
      ) : null}
    </Pressable>
  );
}
