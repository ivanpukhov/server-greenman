import { View, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { AdminListItem } from '@/components/admin/AdminListItem';
import { posts } from '@/hooks/admin/useAdminSocial';
import { greenman } from '@/theme/colors';

export default function AdminPostsIndex() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = posts.useList();
  const remove = posts.useRemove();

  const confirmDelete = (id: number, label: string) => {
    Alert.alert('Удалить пост?', label, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(id);
            Toast.show({ type: 'success', text1: 'Удалено' });
          } catch (e: any) {
            Toast.show({
              type: 'error',
              text1: 'Ошибка удаления',
              text2: e?.response?.data?.message ?? e?.message,
            });
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Header title="Посты" />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={greenman[7]} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 8 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text className="py-8 text-center text-sm text-ink-dim">
              Постов пока нет. Нажмите «+», чтобы создать.
            </Text>
          }
          renderItem={({ item }) => (
            <AdminListItem
              title={item.text?.slice(0, 80) || '(без текста)'}
              subtitle={
                item.media && item.media.length > 0
                  ? `${item.media.length} вложен.`
                  : undefined
              }
              isDraft={item.isDraft}
              onPress={() => router.push(`/admin/posts/${item.id}`)}
              onLongPress={() =>
                confirmDelete(item.id, item.text?.slice(0, 60) ?? 'Пост без текста')
              }
            />
          )}
        />
      )}

      <Pressable
        onPress={() => router.push('/admin/posts/new')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-greenman-7 shadow-lg active:opacity-80"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </Screen>
  );
}
