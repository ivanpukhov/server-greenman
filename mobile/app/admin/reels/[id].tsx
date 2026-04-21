import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { AdminFormScreen } from '@/components/admin/FormScreen';
import { DraftToggle } from '@/components/admin/DraftToggle';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { Text } from '@/components/ui/Text';
import { reels } from '@/hooks/admin/useAdminSocial';
import type { Media, Reel } from '@/lib/api/admin-types';

export default function AdminReelEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';
  const numericId = isNew ? null : Number(id);

  const list = reels.useList();
  const create = reels.useCreate();
  const update = reels.useUpdate();
  const remove = reels.useRemove();

  const existing: Reel | undefined =
    !isNew && list.data ? list.data.find((p) => p.id === numericId) : undefined;

  const [video, setVideo] = useState<Media[]>([]);
  const [thumb, setThumb] = useState<Media[]>([]);
  const [description, setDescription] = useState('');
  const [isDraft, setIsDraft] = useState(true);
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (!isNew && existing && !loaded) {
      setVideo(existing.video ? [existing.video] : []);
      setThumb(existing.thumbnail ? [existing.thumbnail] : []);
      setDescription(existing.description ?? '');
      setIsDraft(existing.isDraft);
      setLoaded(true);
    }
  }, [existing, isNew, loaded]);

  const save = async () => {
    if (video.length === 0) {
      Toast.show({ type: 'error', text1: 'Загрузите видео' });
      return;
    }
    const payload = {
      videoMediaId: video[0].id,
      thumbnailMediaId: thumb[0]?.id ?? null,
      description: description.trim() || null,
      isDraft,
    };
    try {
      if (isNew) {
        await create.mutateAsync(payload as any);
      } else {
        await update.mutateAsync({ id: numericId!, ...(payload as any) });
      }
      Toast.show({ type: 'success', text1: 'Сохранено' });
      router.back();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка сохранения',
        text2: e?.response?.data?.message ?? e?.message,
      });
    }
  };

  const onDelete = async () => {
    if (isNew || !numericId) return;
    try {
      await remove.mutateAsync(numericId);
      Toast.show({ type: 'success', text1: 'Удалено' });
      router.back();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Ошибка удаления', text2: e?.message });
    }
  };

  return (
    <AdminFormScreen
      title={isNew ? 'Новый Reel' : 'Reel'}
      onSave={save}
      onDelete={isNew ? undefined : onDelete}
      saving={create.isPending || update.isPending}
      saveDisabled={!loaded}
    >
      <MediaPicker
        label="Видео (обязательно)"
        accept="video"
        value={video}
        onChange={setVideo}
      />

      <MediaPicker
        label="Обложка (опционально)"
        accept="image"
        value={thumb}
        onChange={setThumb}
      />

      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Описание</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Описание для Reel"
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          className="min-h-[100px] rounded-xl border border-border bg-white p-3 text-base text-ink"
        />
      </View>

      <DraftToggle
        isDraft={isDraft}
        onChange={setIsDraft}
        publishedAt={existing?.publishedAt}
      />
    </AdminFormScreen>
  );
}
