import { useState } from 'react';
import { View, FlatList, Pressable, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/IconButton';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useAdminMediaList,
  useAdminMediaUpload,
  useAdminMediaDelete,
} from '@/hooks/admin/useAdminMedia';
import type { Media, MediaKind } from '@/lib/api/admin-types';
import { greenman } from '@/theme/colors';

const FILTERS: { label: string; value: MediaKind | 'all' }[] = [
  { label: 'Все', value: 'all' },
  { label: 'Фото', value: 'image' },
  { label: 'Видео', value: 'video' },
  { label: 'Аудио', value: 'audio' },
  { label: 'Файлы', value: 'file' },
];

function guessMime(uri: string, name?: string | null): string {
  const c = (name || uri).toLowerCase();
  if (c.endsWith('.png')) return 'image/png';
  if (c.endsWith('.webp')) return 'image/webp';
  if (c.endsWith('.mp4')) return 'video/mp4';
  if (c.endsWith('.mov')) return 'video/quicktime';
  if (c.endsWith('.pdf')) return 'application/pdf';
  if (c.endsWith('.mp3')) return 'audio/mpeg';
  return 'image/jpeg';
}

export default function AdminMediaIndex() {
  const router = useRouter();
  const [filter, setFilter] = useState<MediaKind | 'all'>('all');
  const list = useAdminMediaList(filter === 'all' ? {} : { type: filter });
  const upload = useAdminMediaUpload();
  const remove = useAdminMediaDelete();
  const [progress, setProgress] = useState<number | null>(null);

  const addFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к медиатеке в настройках');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (res.canceled) return;
    for (const a of res.assets ?? []) {
      await upload
        .mutateAsync({
          uri: a.uri,
          name: a.fileName ?? a.uri.split('/').pop() ?? 'file',
          mimeType: a.mimeType ?? guessMime(a.uri, a.fileName),
          onProgress: setProgress,
        })
        .catch((e) =>
          Toast.show({
            type: 'error',
            text1: 'Не удалось загрузить',
            text2: e?.response?.data?.message ?? e?.message,
          })
        );
    }
    setProgress(null);
  };

  const addFromFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    for (const a of res.assets) {
      await upload
        .mutateAsync({
          uri: a.uri,
          name: a.name ?? 'file',
          mimeType: a.mimeType ?? guessMime(a.uri, a.name),
          onProgress: setProgress,
        })
        .catch((e) =>
          Toast.show({
            type: 'error',
            text1: 'Не удалось загрузить',
            text2: e?.response?.data?.message ?? e?.message,
          })
        );
    }
    setProgress(null);
  };

  const onAdd = () => {
    Alert.alert('Загрузить медиа', 'Откуда добавить?', [
      { text: 'Галерея', onPress: addFromGallery },
      { text: 'Файлы (PDF, ZIP, аудио…)', onPress: addFromFiles },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const openItemActions = (m: Media) => {
    Alert.alert(m.originalName ?? 'Медиа', undefined, [
      {
        text: 'Копировать URL',
        onPress: async () => {
          await Clipboard.setStringAsync(m.url);
          Toast.show({ type: 'success', text1: 'URL скопирован' });
        },
      },
      {
        text: 'Копировать ID',
        onPress: async () => {
          await Clipboard.setStringAsync(String(m.id));
          Toast.show({ type: 'success', text1: `ID ${m.id} скопирован` });
        },
      },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Удалить?', 'Медиа будет удалено безвозвратно.', [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Удалить',
              style: 'destructive',
              onPress: () =>
                remove
                  .mutateAsync(m.id)
                  .then(() => Toast.show({ type: 'success', text1: 'Удалено' }))
                  .catch((e) =>
                    Toast.show({
                      type: 'error',
                      text1: 'Не удалось удалить',
                      text2: e?.response?.data?.message ?? e?.message,
                    })
                  ),
            },
          ]);
        },
      },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  return (
    <Screen>
      <Header
        title="Медиа"
        onBack={() => router.back()}
        rightAction={
          <IconButton
            icon={<Ionicons name="add" size={22} color={greenman[7]} />}
            onPress={onAdd}
            accessibilityLabel="Загрузить медиа"
          />
        }
      />

      <View className="flex-row flex-wrap gap-2 px-4 py-3">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1.5 ${active ? 'bg-greenman-7' : 'bg-greenman-0'}`}
            >
              <Text
                className={`text-xs font-semibold ${active ? 'text-white' : 'text-greenman-8'}`}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {upload.isPending ? (
        <View className="mx-4 mb-3 flex-row items-center gap-2 rounded-xl bg-greenman-0 px-3 py-2">
          <ActivityIndicator color={greenman[7]} />
          <Text className="text-xs text-ink-dim">
            Загрузка… {progress !== null ? `${Math.round(progress * 100)}%` : ''}
          </Text>
        </View>
      ) : null}

      {list.isLoading ? (
        <View className="flex-row flex-wrap gap-2 px-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-[31%] rounded-xl" />
          ))}
        </View>
      ) : list.error ? (
        <EmptyState variant="error" title="Не удалось загрузить библиотеку" />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          title="Библиотека пуста"
          subtitle="Загрузите фото, видео или файл — нажмите + в правом верхнем углу."
        />
      ) : (
        <FlatList
          data={list.data ?? []}
          keyExtractor={(m) => String(m.id)}
          numColumns={3}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 32 }}
          columnWrapperStyle={{ gap: 8 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} />
          }
          renderItem={({ item }) => (
            <Pressable
              onLongPress={() => openItemActions(item)}
              onPress={() => openItemActions(item)}
              className="flex-1 aspect-square overflow-hidden rounded-xl border border-border bg-greenman-0"
            >
              {item.type === 'image' ? (
                <Image source={{ uri: item.url }} style={{ flex: 1 }} contentFit="cover" />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Ionicons
                    name={
                      item.type === 'video'
                        ? 'videocam'
                        : item.type === 'audio'
                          ? 'musical-notes'
                          : 'document'
                    }
                    size={28}
                    color={greenman[7]}
                  />
                  <Text className="mt-1 px-1 text-[10px] text-ink-dim" numberOfLines={1}>
                    {item.originalName ?? ''}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
