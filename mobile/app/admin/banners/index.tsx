import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { AdminListItem } from '@/components/admin/AdminListItem';
import { banners } from '@/hooks/admin/useAdminSocial';
import { greenman } from '@/theme/colors';

export default function AdminBannersIndex() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = banners.useList();

  return (
    <Screen>
      <Header title="Баннеры" />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={greenman[7]} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 8 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text className="py-8 text-center text-sm text-ink-dim">
              Баннеров ещё нет.
            </Text>
          }
          renderItem={({ item }) => (
            <AdminListItem
              title={item.title || (item.type === 'text' ? 'Текстовый баннер' : 'Баннер с изображением')}
              subtitle={`${item.type === 'image_link' ? 'Изображение-ссылка' : item.type === 'image' ? 'Изображение' : 'Текстовый'} · порядок ${item.order}`}
              isDraft={item.isDraft}
              leading={
                item.media?.url ? (
                  <Image
                    source={{ uri: item.media.url }}
                    style={{ width: 64, height: 40, borderRadius: 6 }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    className="h-10 w-16 items-center justify-center rounded-md"
                    style={{ backgroundColor: item.backgroundColor || greenman[8] }}
                  >
                    <Ionicons name="albums-outline" size={18} color={item.textColor || '#fff'} />
                  </View>
                )
              }
              onPress={() => router.push(`/admin/banners/${item.id}`)}
            />
          )}
        />
      )}

      <Pressable
        onPress={() => router.push('/admin/banners/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-greenman-7 shadow-lg active:opacity-80"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </Screen>
  );
}
