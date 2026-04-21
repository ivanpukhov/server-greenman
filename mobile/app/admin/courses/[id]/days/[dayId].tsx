import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { AdminFormScreen } from '@/components/admin/FormScreen';
import { DraftToggle } from '@/components/admin/DraftToggle';
import { BlockEditor } from '@/components/admin/BlockEditor';
import { Text } from '@/components/ui/Text';
import {
  useAdminCourseDays,
  useAdminCourseDayCreate,
  useAdminCourseDayUpdate,
  useAdminCourseDayRemove,
} from '@/hooks/admin/useAdminSocial';
import type { EditorDoc } from '@/lib/api/admin-types';

export default function AdminCourseDayEdit() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const router = useRouter();
  const courseId = Number(id);
  const isNew = dayId === 'new';
  const numericDayId = isNew ? null : Number(dayId);

  const daysQuery = useAdminCourseDays(courseId);
  const create = useAdminCourseDayCreate(courseId);
  const update = useAdminCourseDayUpdate(courseId);
  const remove = useAdminCourseDayRemove(courseId);

  const existing = !isNew && daysQuery.data
    ? daysQuery.data.find((d) => d.id === numericDayId)
    : undefined;

  const nextDayNumber = daysQuery.data
    ? Math.max(0, ...daysQuery.data.map((d) => d.dayNumber)) + 1
    : 1;

  const [dayNumber, setDayNumber] = useState(String(nextDayNumber));
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<EditorDoc | null>({ blocks: [] });
  const [isDraft, setIsDraft] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isNew && daysQuery.data && !loaded) {
      setDayNumber(String(nextDayNumber));
      setLoaded(true);
    }
    if (!isNew && existing && !loaded) {
      setDayNumber(String(existing.dayNumber));
      setTitle(existing.title);
      setBlocks(existing.contentBlocks ?? { blocks: [] });
      setIsDraft(existing.isDraft);
      setLoaded(true);
    }
  }, [isNew, daysQuery.data, existing, loaded, nextDayNumber]);

  const save = async () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Укажите заголовок' });
      return;
    }
    const payload = {
      dayNumber: Number(dayNumber) || 1,
      title: title.trim(),
      contentBlocks: blocks ?? { blocks: [] },
      isDraft,
    };
    try {
      if (isNew) {
        await create.mutateAsync(payload as any);
      } else {
        await update.mutateAsync({ id: numericDayId!, ...(payload as any) });
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
    if (isNew || !numericDayId) return;
    try {
      await remove.mutateAsync(numericDayId);
      Toast.show({ type: 'success', text1: 'Удалено' });
      router.back();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Ошибка удаления', text2: e?.message });
    }
  };

  return (
    <AdminFormScreen
      title={isNew ? 'Новый день' : `День ${existing?.dayNumber ?? ''}`}
      onSave={save}
      onDelete={isNew ? undefined : onDelete}
      saving={create.isPending || update.isPending}
      saveDisabled={!loaded}
    >
      <View className="flex-row gap-3">
        <View className="w-24">
          <Text className="mb-1.5 text-xs font-semibold text-ink-dim">№</Text>
          <TextInput
            value={dayNumber}
            onChangeText={(v) => setDayNumber(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            className="h-12 rounded-xl border border-border bg-white px-3 text-base text-ink"
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Заголовок</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Название дня"
            placeholderTextColor="#9ca3af"
            className="h-12 rounded-xl border border-border bg-white px-3 text-base text-ink"
          />
        </View>
      </View>

      <BlockEditor label="Содержание" value={blocks} onChange={setBlocks} />

      <DraftToggle isDraft={isDraft} onChange={setIsDraft} />
    </AdminFormScreen>
  );
}
