import { useMemo, useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
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
  useAdminMediaBulkDelete,
} from '@/hooks/admin/useAdminMedia';
import type { Media, MediaKind } from '@/lib/api/admin-types';
import { greenman, semantic } from '@/theme/colors';

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
  const [q, setQ] = useState('');
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const selectMode = selection.size > 0;

  const listParams = useMemo(() => {
    const p: { type?: MediaKind; q?: string } = {};
    if (filter !== 'all') p.type = filter;
    if (q.trim()) p.q = q.trim();
    return p;
  }, [filter, q]);

  const list = useAdminMediaList(listParams);
  const upload = useAdminMediaUpload();
  const remove = useAdminMediaDelete();
  const bulkRemove = useAdminMediaBulkDelete();
  const [progress, setProgress] = useState<number | null>(null);

  const toggleSelect = (id: number) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelection(new Set());

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

  const onBulkDelete = () => {
    const ids = [...selection];
    if (!ids.length) return;
    Alert.alert(
      `Удалить ${ids.length}?`,
      'Выбранные медиа будут удалены безвозвратно.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () =>
            bulkRemove
              .mutateAsync(ids)
              .then(() => {
                Toast.show({ type: 'success', text1: `Удалено ${ids.length}` });
                clearSelection();
              })
              .catch((e) =>
                Toast.show({
                  type: 'error',
                  text1: 'Не удалось удалить',
                  text2: e?.response?.data?.message ?? e?.message,
                })
              ),
        },
      ]
    );
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
        title={selectMode ? `Выбрано: ${selection.size}` : 'Медиа'}
        onBack={selectMode ? clearSelection : () => router.back()}
        rightAction={
          selectMode ? (
            <IconButton
              icon={<Ionicons name="trash-outline" size={20} color={semantic.danger} />}
              onPress={onBulkDelete}
              accessibilityLabel="Удалить выбранные"
            />
          ) : (
            <IconButton
              icon={<Ionicons name="add" size={22} color={greenman[7]} />}
              onPress={onAdd}
              accessibilityLabel="Загрузить медиа"
            />
          )
        }
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingTop: 12,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: greenman[0],
            paddingHorizontal: 12,
            height: 40,
            borderRadius: 999,
          }}
        >
          <Ionicons name="search" size={16} color={semantic.inkDim} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Поиск по имени…"
            placeholderTextColor={semantic.inkMuted}
            style={{
              flex: 1,
              fontFamily: 'Manrope_500Medium',
              fontSize: 14,
              color: semantic.ink,
            }}
          />
          {q ? (
            <Pressable onPress={() => setQ('')}>
              <Ionicons name="close-circle" size={16} color={semantic.inkDim} />
            </Pressable>
          ) : null}
        </View>
      </View>

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
          title={q ? 'Ничего не найдено' : 'Библиотека пуста'}
          subtitle={
            q
              ? 'Попробуйте изменить запрос или сбросить фильтр.'
              : 'Загрузите фото, видео или файл — нажмите + в правом верхнем углу.'
          }
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
          renderItem={({ item }) => {
            const selected = selection.has(item.id);
            const typeIcon =
              item.type === 'video'
                ? 'videocam'
                : item.type === 'audio'
                  ? 'musical-notes'
                  : item.type === 'file'
                    ? 'document'
                    : null;
            return (
              <Pressable
                onLongPress={() => toggleSelect(item.id)}
                onPress={() =>
                  selectMode ? toggleSelect(item.id) : openItemActions(item)
                }
                className="flex-1 aspect-square overflow-hidden rounded-xl border border-border bg-greenman-0"
                style={
                  selected
                    ? { borderColor: greenman[7], borderWidth: 2 }
                    : undefined
                }
              >
                {item.type === 'image' ? (
                  <Image source={{ uri: item.url }} style={{ flex: 1 }} contentFit="cover" />
                ) : (
                  <View className="flex-1 items-center justify-center p-1">
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
                    <Text
                      className="mt-1 px-1 text-[10px] text-ink-dim"
                      numberOfLines={1}
                    >
                      {item.originalName ?? ''}
                    </Text>
                  </View>
                )}
                {typeIcon ? (
                  <View className="absolute bottom-1.5 left-1.5 h-5 w-5 items-center justify-center rounded-full bg-black/55">
                    <Ionicons name={typeIcon} size={11} color="#fff" />
                  </View>
                ) : null}
                {selected ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: greenman[7],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
