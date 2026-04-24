import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { AdminFormScreen } from '@/components/admin/FormScreen';
import { DraftToggle } from '@/components/admin/DraftToggle';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { BlockEditorWebView } from '@/components/admin/BlockEditorWebView';
import { SlugInput, slugify } from '@/components/admin/SlugInput';
import { Text } from '@/components/ui/Text';
import { articles } from '@/hooks/admin/useAdminSocial';
import type { EditorDoc, Media } from '@/lib/api/admin-types';

export default function AdminArticleEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';
  const numericId = isNew ? null : Number(id);

  const one = articles.useOne(numericId);
  const create = articles.useCreate();
  const update = articles.useUpdate();
  const remove = articles.useRemove();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [cover, setCover] = useState<Media[]>([]);
  const [blocks, setBlocks] = useState<EditorDoc | null>({ blocks: [] });
  const [isDraft, setIsDraft] = useState(false);
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (!isNew && one.data && !loaded) {
      const a = one.data;
      setTitle(a.title);
      setSlug(a.slug);
      setSlugTouched(true);
      setExcerpt(a.excerpt ?? '');
      setCover(a.cover ? [a.cover] : []);
      setBlocks(a.blocks ?? { blocks: [] });
      setIsDraft(a.isDraft);
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
      excerpt: excerpt.trim() || null,
      coverMediaId: cover[0]?.id ?? null,
      blocks: blocks ?? { blocks: [] },
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
      title={isNew ? 'Новая статья' : 'Статья'}
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
          placeholder="Название статьи"
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
          value={excerpt}
          onChangeText={setExcerpt}
          placeholder="1-2 предложения"
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          className="min-h-[80px] rounded-xl border border-border bg-white p-3 text-base text-ink"
        />
      </View>

      <MediaPicker
        label="Обложка"
        accept="image"
        value={cover}
        onChange={setCover}
      />

      <BlockEditorWebView label="Содержание" value={blocks} onChange={setBlocks} />

      <DraftToggle
        isDraft={isDraft}
        onChange={setIsDraft}
        publishedAt={one.data?.publishedAt}
      />
    </AdminFormScreen>
  );
}
