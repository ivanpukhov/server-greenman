import { useState } from 'react';
import { View, FlatList, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { useAdminComments, useAdminCommentRemove } from '@/hooks/admin/useAdminSocial';
import { greenman } from '@/theme/colors';
import type { AdminComment } from '@/lib/api/admin-types';

type FilterValue = 'all' | 'post' | 'reel' | 'article' | 'webinar' | 'course_day';

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'post', label: 'Посты' },
  { value: 'reel', label: 'Reels' },
  { value: 'article', label: 'Статьи' },
  { value: 'webinar', label: 'Вебинары' },
  { value: 'course_day', label: 'Курсы' },
];

export default function AdminCommentsIndex() {
  const [filter, setFilter] = useState<FilterValue>('all');
  const { data, isLoading, refetch, isRefetching } = useAdminComments(
    filter === 'all' ? undefined : filter
  );
  const remove = useAdminCommentRemove();

  const confirmDelete = (item: AdminComment) => {
    Alert.alert('Удалить комментарий?', item.body.slice(0, 120), [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(item.id);
            Toast.show({ type: 'success', text1: 'Удалено' });
          } catch (e: any) {
            Toast.show({ type: 'error', text1: 'Ошибка', text2: e?.message });
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Header title="Комментарии" />
      <View className="border-b border-border bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: 12, gap: 8 }}
        >
          {FILTERS.map((f) => {
            const active = f.value === filter;
            return (
              <Pressable
                key={f.value}
                onPress={() => setFilter(f.value)}
                className={`rounded-full px-4 py-2 ${
                  active ? 'bg-greenman-7' : 'bg-greenman-0'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-white' : 'text-greenman-8'
                  }`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={greenman[7]} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text className="py-8 text-center text-sm text-ink-dim">
              Комментариев нет.
            </Text>
          }
          renderItem={({ item }) => {
            const author = item.adminUser
              ? item.adminUser.fullName
              : item.user?.phoneNumber ?? 'Аноним';
            const when = item.createdAt
              ? new Date(item.createdAt).toLocaleString('ru-RU')
              : '';
            return (
              <View className="rounded-xl border border-border bg-white p-3">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-xs text-ink-dim">
                      {author} · {item.commentableType} #{item.commentableId}
                    </Text>
                    <Text className="mt-1 text-sm text-ink">{item.body}</Text>
                    {when ? (
                      <Text className="mt-1 text-[10px] text-ink-dim">{when}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => confirmDelete(item)}
                    className="h-9 w-9 items-center justify-center rounded-full bg-red-50 active:opacity-70"
                  >
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}
