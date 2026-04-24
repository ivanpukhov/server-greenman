import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { AdminFormScreen } from '@/components/admin/FormScreen';
import { DraftToggle } from '@/components/admin/DraftToggle';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { Text } from '@/components/ui/Text';
import { banners } from '@/hooks/admin/useAdminSocial';
import type { Banner, BannerType, Media } from '@/lib/api/admin-types';
import { greenman, clay, plum, sand, sun } from '@/theme/colors';

const TYPE_OPTIONS: { value: BannerType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'text', label: 'Текстовый', icon: 'text-outline' },
  { value: 'image', label: 'Изображение', icon: 'image-outline' },
  { value: 'image_link', label: 'Изображение-ссылка', icon: 'link-outline' },
];

const BACKGROUNDS = [
  '#05210f',
  greenman[8],
  clay[5],
  plum[3],
  '#243b53',
  sun[3],
  sand[2],
];

export default function AdminBannerEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';
  const numericId = isNew ? null : Number(id);

  const list = banners.useList();
  const create = banners.useCreate();
  const update = banners.useUpdate();
  const remove = banners.useRemove();

  const existing: Banner | undefined =
    !isNew && list.data ? list.data.find((b) => b.id === numericId) : undefined;

  const [type, setType] = useState<BannerType>('text');
  const [title, setTitle] = useState('Забота о здоровье каждый день');
  const [text, setText] = useState('Подберите натуральные средства и курсы Greenman под вашу задачу.');
  const [buttonText, setButtonText] = useState('Перейти');
  const [buttonUrl, setButtonUrl] = useState('/catalog');
  const [linkUrl, setLinkUrl] = useState('/catalog');
  const [backgroundColor, setBackgroundColor] = useState('#05210f');
  const [textColor, setTextColor] = useState('#ffffff');
  const [order, setOrder] = useState('0');
  const [media, setMedia] = useState<Media[]>([]);
  const [isDraft, setIsDraft] = useState(false);
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (!isNew && existing && !loaded) {
      setType(existing.type);
      setTitle(existing.title ?? '');
      setText(existing.text ?? '');
      setButtonText(existing.buttonText ?? '');
      setButtonUrl(existing.buttonUrl ?? '');
      setLinkUrl(existing.linkUrl ?? '');
      setBackgroundColor(existing.backgroundColor ?? '#05210f');
      setTextColor(existing.textColor ?? '#ffffff');
      setOrder(String(existing.order ?? 0));
      setMedia(existing.media ? [existing.media] : []);
      setIsDraft(existing.isDraft);
      setLoaded(true);
    }
  }, [existing, isNew, loaded]);

  const save = async () => {
    if ((type === 'image' || type === 'image_link') && media.length === 0) {
      Toast.show({ type: 'error', text1: 'Выберите изображение' });
      return;
    }
    if (type === 'image_link' && !linkUrl.trim()) {
      Toast.show({ type: 'error', text1: 'Добавьте ссылку для клика' });
      return;
    }
    const payload = {
      type,
      title: title.trim() || null,
      text: text.trim() || null,
      buttonText: buttonText.trim() || null,
      buttonUrl: buttonUrl.trim() || null,
      linkUrl: linkUrl.trim() || null,
      backgroundColor,
      textColor,
      mediaId: media[0]?.id ?? null,
      order: Number(order) || 0,
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
      title={isNew ? 'Новый баннер' : 'Баннер'}
      onSave={save}
      onDelete={isNew ? undefined : onDelete}
      saving={create.isPending || update.isPending}
      saveDisabled={!loaded}
    >
      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Тип баннера</Text>
        <View className="gap-2">
          {TYPE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setType(option.value)}
              className={`flex-row items-center gap-3 rounded-xl border px-3 py-3 ${
                type === option.value ? 'border-greenman-7 bg-greenman-0' : 'border-border bg-white'
              }`}
            >
              <Ionicons name={option.icon} size={18} color={greenman[8]} />
              <Text className="flex-1 text-sm font-bold text-ink">{option.label}</Text>
              {type === option.value ? (
                <Ionicons name="checkmark-circle" size={18} color={greenman[7]} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>

      {(type === 'image' || type === 'image_link') ? (
        <MediaPicker
          label="Изображение"
          accept="image"
          value={media}
          onChange={setMedia}
        />
      ) : null}

      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Превью</Text>
        <View
          className="h-[150px] overflow-hidden rounded-xl p-4"
          style={{ backgroundColor }}
        >
          {media[0]?.url && type !== 'text' ? (
            <Image source={{ uri: media[0].url }} style={{ flex: 1, borderRadius: 12 }} contentFit="cover" />
          ) : (
            <View className="flex-1 justify-center">
              <Text style={{ color: textColor, fontSize: 22, fontWeight: '800' }} numberOfLines={2}>
                {title || 'Заголовок баннера'}
              </Text>
              <Text style={{ color: textColor, opacity: 0.78, marginTop: 8 }} numberOfLines={2}>
                {text || 'Короткий текст баннера'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {type === 'text' ? (
        <>
          <View>
            <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Фон</Text>
            <View className="flex-row flex-wrap gap-2">
              {BACKGROUNDS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setBackgroundColor(c)}
                  className="h-10 w-10 items-center justify-center rounded-full border border-border"
                  style={{ backgroundColor: c }}
                >
                  {backgroundColor === c ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                </Pressable>
              ))}
            </View>
          </View>
          <Field label="Заголовок" value={title} onChangeText={setTitle} />
          <Field label="Текст" value={text} onChangeText={setText} multiline />
          <Field label="Текст кнопки" value={buttonText} onChangeText={setButtonText} />
          <Field label="Ссылка кнопки" value={buttonUrl} onChangeText={setButtonUrl} placeholder="/catalog или https://..." />
        </>
      ) : null}

      {type === 'image_link' ? (
        <Field label="Ссылка при клике" value={linkUrl} onChangeText={setLinkUrl} placeholder="/catalog или https://..." />
      ) : null}

      <Field
        label="Порядок"
        value={order}
        onChangeText={(v) => setOrder(v.replace(/[^\d-]/g, ''))}
        keyboardType="number-pad"
      />

      <DraftToggle
        isDraft={isDraft}
        onChange={setIsDraft}
        publishedAt={existing?.publishedAt}
      />
    </AdminFormScreen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-semibold text-ink-dim">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`${multiline ? 'min-h-[88px] p-3' : 'h-12 px-3'} rounded-xl border border-border bg-white text-base text-ink`}
      />
    </View>
  );
}
