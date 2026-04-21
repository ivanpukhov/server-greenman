import { useEffect, useState } from 'react';
import { TextInput, View, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { AdminFormScreen } from '@/components/admin/FormScreen';
import { AdminListItem } from '@/components/admin/AdminListItem';
import { DraftToggle } from '@/components/admin/DraftToggle';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { BlockEditor } from '@/components/admin/BlockEditor';
import { SlugInput, slugify } from '@/components/admin/SlugInput';
import { Text } from '@/components/ui/Text';
import { courses, useAdminCourseDays } from '@/hooks/admin/useAdminSocial';
import type { EditorDoc, Media } from '@/lib/api/admin-types';
import { greenman } from '@/theme/colors';

export default function AdminCourseEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';
  const numericId = isNew ? null : Number(id);

  const one = courses.useOne(numericId);
  const create = courses.useCreate();
  const update = courses.useUpdate();
  const remove = courses.useRemove();
  const daysQuery = useAdminCourseDays(numericId);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [shortDescription, setShortDescription] = useState('');
  const [blocks, setBlocks] = useState<EditorDoc | null>({ blocks: [] });
  const [trailer, setTrailer] = useState<Media[]>([]);
  const [cover, setCover] = useState<Media[]>([]);
  const [priceCents, setPriceCents] = useState('0');
  const [durationDays, setDurationDays] = useState('7');
  const [isDraft, setIsDraft] = useState(true);
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (!isNew && one.data && !loaded) {
      const c = one.data;
      setTitle(c.title);
      setSlug(c.slug);
      setSlugTouched(true);
      setShortDescription(c.shortDescription ?? '');
      setBlocks(c.descriptionBlocks ?? { blocks: [] });
      setTrailer(c.trailer ? [c.trailer] : []);
      setCover(c.cover ? [c.cover] : []);
      setPriceCents(String(c.priceCents ?? 0));
      setDurationDays(String(c.durationDays ?? 7));
      setIsDraft(c.isDraft);
      setLoaded(true);
    }
  }, [one.data, isNew, loaded]);

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const save = async () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Укажите заголовок' });
      return;
    }
    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      shortDescription: shortDescription.trim() || null,
      descriptionBlocks: blocks ?? { blocks: [] },
      trailerMediaId: trailer[0]?.id ?? null,
      coverMediaId: cover[0]?.id ?? null,
      priceCents: Number(priceCents) || 0,
      currency: 'KZT',
      durationDays: Number(durationDays) || 1,
      isDraft,
    };
    try {
      let savedId = numericId;
      if (isNew) {
        const created = await create.mutateAsync(payload as any);
        savedId = created.id;
      } else {
        await update.mutateAsync({ id: numericId!, ...(payload as any) });
      }
      Toast.show({ type: 'success', text1: 'Сохранено' });
      if (isNew && savedId) {
        router.replace(`/admin/courses/${savedId}`);
      } else {
        router.back();
      }
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
      title={isNew ? 'Новый курс' : 'Курс'}
      onSave={save}
      onDelete={isNew ? undefined : onDelete}
      saving={create.isPending || update.isPending}
      saveDisabled={!loaded}
    >
      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Заголовок</Text>
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          placeholder="Название курса"
          placeholderTextColor="#9ca3af"
          className="h-12 rounded-xl border border-border bg-white px-3 text-base text-ink"
        />
      </View>

      <SlugInput
        value={slug}
        onChange={(v) => {
          setSlug(v);
          setSlugTouched(true);
        }}
      />

      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">
          Короткое описание
        </Text>
        <TextInput
          value={shortDescription}
          onChangeText={setShortDescription}
          placeholder="1-2 предложения"
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          className="min-h-[80px] rounded-xl border border-border bg-white p-3 text-base text-ink"
        />
      </View>

      <MediaPicker label="Обложка" accept="image" value={cover} onChange={setCover} />
      <MediaPicker label="Трейлер" accept="video" value={trailer} onChange={setTrailer} />

      <BlockEditor label="Описание" value={blocks} onChange={setBlocks} />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Цена (тиын)</Text>
          <TextInput
            value={priceCents}
            onChangeText={(v) => setPriceCents(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            className="h-12 rounded-xl border border-border bg-white px-3 text-base text-ink"
          />
          <Text className="mt-1 text-[10px] text-ink-dim">
            ≈ {Number(priceCents) ? (Number(priceCents) / 100).toLocaleString('ru-RU') : 0} ₸
          </Text>
        </View>
        <View className="flex-1">
          <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Дней</Text>
          <TextInput
            value={durationDays}
            onChangeText={(v) => setDurationDays(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            className="h-12 rounded-xl border border-border bg-white px-3 text-base text-ink"
          />
        </View>
      </View>

      <DraftToggle
        isDraft={isDraft}
        onChange={setIsDraft}
        publishedAt={one.data?.publishedAt}
      />

      {!isNew && numericId ? (
        <View className="mt-4 rounded-xl border border-border bg-white p-3">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-ink">Дни курса</Text>
            <Pressable
              onPress={() => router.push(`/admin/courses/${numericId}/days/new`)}
              className="flex-row items-center gap-1 rounded-full bg-greenman-0 px-3 py-1 active:opacity-70"
            >
              <Ionicons name="add" size={16} color={greenman[8]} />
              <Text className="text-xs font-semibold text-greenman-8">День</Text>
            </Pressable>
          </View>
          {daysQuery.isLoading ? (
            <ActivityIndicator color={greenman[7]} />
          ) : !daysQuery.data || daysQuery.data.length === 0 ? (
            <Text className="py-4 text-center text-xs text-ink-dim">
              Дней ещё нет.
            </Text>
          ) : (
            <View className="gap-2">
              {daysQuery.data.map((d) => (
                <AdminListItem
                  key={d.id}
                  title={`День ${d.dayNumber}: ${d.title}`}
                  isDraft={d.isDraft}
                  onPress={() =>
                    router.push(`/admin/courses/${numericId}/days/${d.id}`)
                  }
                />
              ))}
            </View>
          )}
        </View>
      ) : null}
    </AdminFormScreen>
  );
}
