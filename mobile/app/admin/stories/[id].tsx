import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { AdminFormScreen } from '@/components/admin/FormScreen';
import { DraftToggle } from '@/components/admin/DraftToggle';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { Text } from '@/components/ui/Text';
import { stories } from '@/hooks/admin/useAdminSocial';
import type { Media, Story } from '@/lib/api/admin-types';

export default function AdminStoryEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';
  const numericId = isNew ? null : Number(id);

  const list = stories.useList();
  const create = stories.useCreate();
  const update = stories.useUpdate();
  const remove = stories.useRemove();

  const existing: Story | undefined =
    !isNew && list.data ? list.data.find((p) => p.id === numericId) : undefined;

  const [media, setMedia] = useState<Media[]>([]);
  const [caption, setCaption] = useState('');
  const [durationSec, setDurationSec] = useState('7');
  const [ttlHours, setTtlHours] = useState('24');
  const [isDraft, setIsDraft] = useState(true);
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (!isNew && existing && !loaded) {
      setMedia(existing.media ? [existing.media] : []);
      setCaption(existing.caption ?? '');
      setDurationSec(String(existing.durationSec ?? 7));
      setIsDraft(existing.isDraft);
      setLoaded(true);
    }
  }, [existing, isNew, loaded]);

  const save = async () => {
    if (media.length === 0) {
      Toast.show({ type: 'error', text1: 'Нужна картинка или видео' });
      return;
    }
    const base = {
      caption: caption.trim() || null,
      durationSec: Number(durationSec) || 7,
      isDraft,
    };
    try {
      if (isNew) {
        await create.mutateAsync({
          ...base,
          mediaId: media[0].id,
          ttlHours: Number(ttlHours) || 24,
        } as any);
      } else {
        await update.mutateAsync({ id: numericId!, ...(base as any) });
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
      title={isNew ? 'Новая сториз' : 'Сториз'}
      onSave={save}
      onDelete={isNew ? undefined : onDelete}
      saving={create.isPending || update.isPending}
      saveDisabled={!loaded}
    >
      <MediaPicker
        label="Медиа (обязательно)"
        accept="image-video"
        value={media}
        onChange={setMedia}
      />

      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Подпись</Text>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Короткая подпись"
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          className="min-h-[80px] rounded-xl border border-border bg-white p-3 text-base text-ink"
        />
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="mb-1.5 text-xs font-semibold text-ink-dim">
            Длительность (сек)
          </Text>
          <TextInput
            value={durationSec}
            onChangeText={(v) => setDurationSec(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            className="h-12 rounded-xl border border-border bg-white px-3 text-base text-ink"
          />
        </View>
        {isNew ? (
          <View className="flex-1">
            <Text className="mb-1.5 text-xs font-semibold text-ink-dim">
              TTL (часы)
            </Text>
            <TextInput
              value={ttlHours}
              onChangeText={(v) => setTtlHours(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              className="h-12 rounded-xl border border-border bg-white px-3 text-base text-ink"
            />
          </View>
        ) : null}
      </View>

      <DraftToggle
        isDraft={isDraft}
        onChange={setIsDraft}
        publishedAt={existing?.publishedAt}
      />

      {existing?.expiresAt ? (
        <Text className="text-xs text-ink-dim">
          Истечёт: {new Date(existing.expiresAt).toLocaleString('ru-RU')}
        </Text>
      ) : null}
    </AdminFormScreen>
  );
}
