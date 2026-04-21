import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { AdminListItem } from '@/components/admin/AdminListItem';
import { articles } from '@/hooks/admin/useAdminSocial';
import { greenman } from '@/theme/colors';

export default function AdminArticlesIndex() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = articles.useList();

  return (
    <Screen>
      <Header title="Статьи" />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={greenman[7]} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 8 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text className="py-8 text-center text-sm text-ink-dim">
              Статей ещё нет.
            </Text>
          }
          renderItem={({ item }) => (
            <AdminListItem
              title={item.title}
              subtitle={item.excerpt ?? item.slug}
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
                    <Ionicons name="document-text-outline" size={20} color={greenman[7]} />
                  </View>
                )
              }
              onPress={() => router.push(`/admin/articles/${item.id}`)}
            />
          )}
        />
      )}

      <Pressable
        onPress={() => router.push('/admin/articles/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-greenman-7 shadow-lg active:opacity-80"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </Screen>
  );
}
