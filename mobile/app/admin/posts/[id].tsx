import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { AdminFormScreen } from '@/components/admin/FormScreen';
import { DraftToggle } from '@/components/admin/DraftToggle';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { Text } from '@/components/ui/Text';
import { posts } from '@/hooks/admin/useAdminSocial';
import type { Media, Post } from '@/lib/api/admin-types';

export default function AdminPostEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';
  const numericId = isNew ? null : Number(id);

  const list = posts.useList();
  const create = posts.useCreate();
  const update = posts.useUpdate();
  const remove = posts.useRemove();

  const existing: Post | undefined =
    !isNew && list.data ? list.data.find((p) => p.id === numericId) : undefined;

  const [text, setText] = useState('');
  const [media, setMedia] = useState<Media[]>([]);
  const [isDraft, setIsDraft] = useState(true);
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (!isNew && existing && !loaded) {
      setText(existing.text ?? '');
      setMedia(existing.media ?? []);
      setIsDraft(existing.isDraft);
      setLoaded(true);
    }
  }, [existing, isNew, loaded]);

  const save = async () => {
    const payload = {
      text: text.trim() || null,
      isDraft,
      mediaIds: media.map((m) => m.id),
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
      title={isNew ? 'Новый пост' : 'Пост'}
      onSave={save}
      onDelete={isNew ? undefined : onDelete}
      saving={create.isPending || update.isPending}
      saveDisabled={!loaded}
    >
      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Текст</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Что нового?"
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          className="min-h-[140px] rounded-xl border border-border bg-white p-3 text-base text-ink"
        />
      </View>

      <MediaPicker
        label="Вложения"
        accept="image-video"
        multiple
        value={media}
        onChange={setMedia}
      />

      <DraftToggle
        isDraft={isDraft}
        onChange={setIsDraft}
        publishedAt={existing?.publishedAt}
      />
    </AdminFormScreen>
  );
}
