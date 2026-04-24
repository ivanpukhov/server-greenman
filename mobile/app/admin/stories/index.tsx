import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { AdminListItem } from '@/components/admin/AdminListItem';
import { stories } from '@/hooks/admin/useAdminSocial';
import { greenman } from '@/theme/colors';

export default function AdminStoriesIndex() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = stories.useList();

  return (
    <Screen>
      <Header title="Сториз" />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={greenman[7]} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 8 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text className="py-8 text-center text-sm text-ink-dim">
              Сторизов ещё нет.
            </Text>
          }
          renderItem={({ item }) => (
            <AdminListItem
              title={item.caption || '(без подписи)'}
              subtitle={
                item.expiresAt
                  ? `${item.categoryTitle ?? 'Greenman'} · до ${new Date(item.expiresAt).toLocaleString('ru-RU')}`
                  : `${item.categoryTitle ?? 'Greenman'} · ${item.durationSec}с`
              }
              isDraft={item.isDraft}
              leading={
                item.media?.url ? (
                  <Image
                    source={{ uri: item.media.url }}
                    style={{ width: 40, height: 56, borderRadius: 6 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="h-14 w-10 items-center justify-center rounded-md bg-greenman-0">
                    <Ionicons name="image-outline" size={18} color={greenman[7]} />
                  </View>
                )
              }
              onPress={() => router.push(`/admin/stories/${item.id}`)}
            />
          )}
        />
      )}

      <Pressable
        onPress={() => router.push('/admin/stories/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-greenman-7 shadow-lg active:opacity-80"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </Screen>
  );
}
