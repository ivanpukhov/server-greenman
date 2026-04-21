import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { AdminListItem } from '@/components/admin/AdminListItem';
import { webinars } from '@/hooks/admin/useAdminSocial';
import { greenman } from '@/theme/colors';

export default function AdminWebinarsIndex() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = webinars.useList();

  return (
    <Screen>
      <Header title="Вебинары" />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={greenman[7]} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(w) => String(w.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 8 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text className="py-8 text-center text-sm text-ink-dim">
              Вебинаров ещё нет.
            </Text>
          }
          renderItem={({ item }) => (
            <AdminListItem
              title={item.title}
              subtitle={item.slug}
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
                    <Ionicons name="play-circle-outline" size={20} color={greenman[7]} />
                  </View>
                )
              }
              onPress={() => router.push(`/admin/webinars/${item.id}`)}
            />
          )}
        />
      )}

      <Pressable
        onPress={() => router.push('/admin/webinars/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-greenman-7 shadow-lg active:opacity-80"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </Screen>
  );
}
