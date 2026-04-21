import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { AdminListItem } from '@/components/admin/AdminListItem';
import { courses } from '@/hooks/admin/useAdminSocial';
import { greenman } from '@/theme/colors';

function formatPrice(cents: number, currency: string) {
  const amount = (cents / 100).toLocaleString('ru-RU');
  return `${amount} ${currency === 'KZT' ? '₸' : currency}`;
}

export default function AdminCoursesIndex() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = courses.useList();

  return (
    <Screen>
      <Header title="Курсы" />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={greenman[7]} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 8 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text className="py-8 text-center text-sm text-ink-dim">
              Курсов ещё нет.
            </Text>
          }
          renderItem={({ item }) => (
            <AdminListItem
              title={item.title}
              subtitle={`${formatPrice(item.priceCents, item.currency)} · ${item.durationDays} дн.`}
              isDraft={item.isDraft}
              leading={
                item.cover?.url ? (
                  <Image
                    source={{ uri: item.cover.url }}
                    style={{ width: 48, height: 48, borderRadius: 8 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="h-12 w-12 items-center justify-center rounded-lg bg-greenman-0">
                    <Ionicons name="school-outline" size={20} color={greenman[7]} />
                  </View>
                )
              }
              onPress={() => router.push(`/admin/courses/${item.id}`)}
            />
          )}
        />
      )}

      <Pressable
        onPress={() => router.push('/admin/courses/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-greenman-7 shadow-lg active:opacity-80"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </Screen>
  );
}
