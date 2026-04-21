import { useState } from 'react';
import { View, Pressable, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Text } from '@/components/ui/Text';
import { useAdminMediaUpload } from '@/hooks/admin/useAdminMedia';
import type { Media } from '@/lib/api/admin-types';
import { greenman } from '@/theme/colors';

type Accept = 'image' | 'video' | 'image-video' | 'any';

type Props = {
  label?: string;
  accept?: Accept;
  multiple?: boolean;
  value: Media[];
  onChange: (next: Media[]) => void;
  source?: 'camera-roll' | 'document' | 'auto';
};

function guessMimeType(uri: string, name?: string | null): string {
  const candidate = (name || uri).toLowerCase();
  if (candidate.endsWith('.png')) return 'image/png';
  if (candidate.endsWith('.webp')) return 'image/webp';
  if (candidate.endsWith('.gif')) return 'image/gif';
  if (candidate.endsWith('.mp4')) return 'video/mp4';
  if (candidate.endsWith('.mov')) return 'video/quicktime';
  if (candidate.endsWith('.webm')) return 'video/webm';
  if (candidate.endsWith('.pdf')) return 'application/pdf';
  if (candidate.endsWith('.zip')) return 'application/zip';
  if (candidate.endsWith('.mp3')) return 'audio/mpeg';
  return 'image/jpeg';
}

function fileName(uri: string, fallback = 'file'): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] || fallback;
}

export function MediaPicker({
  label,
  accept = 'image',
  multiple = false,
  value,
  onChange,
  source = 'auto',
}: Props) {
  const upload = useAdminMediaUpload();
  const [progress, setProgress] = useState<number | null>(null);

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к медиатеке в настройках');
      return;
    }
    const mediaTypes: ImagePicker.MediaType[] =
      accept === 'image'
        ? ['images']
        : accept === 'video'
          ? ['videos']
          : ['images', 'videos'];
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsMultipleSelection: multiple,
      quality: 0.9,
    });
    if (res.canceled) return;
    const assets = res.assets ?? [];
    await uploadAssets(
      assets.map((a) => ({
        uri: a.uri,
        name: a.fileName ?? fileName(a.uri),
        mimeType: a.mimeType ?? guessMimeType(a.uri, a.fileName),
      }))
    );
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      multiple,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    await uploadAssets(
      res.assets.map((a) => ({
        uri: a.uri,
        name: a.name ?? fileName(a.uri),
        mimeType: a.mimeType ?? guessMimeType(a.uri, a.name),
      }))
    );
  };

  const uploadAssets = async (
    items: { uri: string; name: string; mimeType: string }[]
  ) => {
    const uploaded: Media[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const media = await upload.mutateAsync({
          uri: item.uri,
          name: item.name,
          mimeType: item.mimeType,
          onProgress: (f) => setProgress(f),
        });
        uploaded.push(media);
      } catch (e: any) {
        Toast.show({
          type: 'error',
          text1: `Не удалось загрузить ${item.name}`,
          text2: e?.response?.data?.message ?? e?.message,
        });
      }
    }
    setProgress(null);
    if (uploaded.length > 0) {
      onChange(multiple ? [...value, ...uploaded] : uploaded);
    }
  };

  const remove = (id: number) => {
    onChange(value.filter((m) => m.id !== id));
  };

  const onAdd = () => {
    if (source === 'document' || accept === 'any') {
      pickDocument();
    } else {
      pickFromLibrary();
    }
  };

  return (
    <View>
      {label ? (
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">{label}</Text>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {value.map((m) => (
          <View
            key={m.id}
            className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-greenman-0"
          >
            {m.type === 'image' ? (
              <Image source={{ uri: m.url }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons
                  name={
                    m.type === 'video'
                      ? 'videocam'
                      : m.type === 'audio'
                        ? 'musical-notes'
                        : 'document'
                  }
                  size={22}
                  color={greenman[7]}
                />
              </View>
            )}
            <Pressable
              onPress={() => remove(m.id)}
              className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60"
            >
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={onAdd}
          disabled={upload.isPending}
          className="h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-greenman-3 bg-white active:opacity-70"
        >
          {upload.isPending ? (
            <View className="items-center">
              <ActivityIndicator color={greenman[7]} />
              {progress !== null ? (
                <Text className="mt-1 text-[10px] text-ink-dim">
                  {Math.round(progress * 100)}%
                </Text>
              ) : null}
            </View>
          ) : (
            <>
              <Ionicons name="add" size={24} color={greenman[7]} />
              <Text className="mt-0.5 text-[10px] text-ink-dim">
                {accept === 'video' ? 'Видео' : accept === 'any' ? 'Файл' : 'Фото'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
