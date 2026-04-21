import { useRef } from 'react';
import { View, TextInput, Pressable, Alert } from 'react-native';
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MediaGridPicker, type MediaGridPickerRef } from './MediaGridPicker';
import { MediaPicker } from './MediaPicker';
import type { EditorBlock, EditorDoc, Media } from '@/lib/api/admin-types';
import { greenman } from '@/theme/colors';

cssInterop(TextInput, { className: 'style' });

type Props = {
  label?: string;
  value: EditorDoc | null;
  onChange: (next: EditorDoc) => void;
};

function emptyBlock(type: EditorBlock['type']): EditorBlock {
  switch (type) {
    case 'paragraph':
      return { type: 'paragraph', data: { text: '' } };
    case 'header':
      return { type: 'header', data: { text: '', level: 2 } };
    case 'list':
      return { type: 'list', data: { style: 'unordered', items: [''] } };
    case 'image':
      return { type: 'image', data: { mediaId: 0, url: '', caption: '' } };
  }
}

export function BlockEditor({ label, value, onChange }: Props) {
  const pickerRef = useRef<MediaGridPickerRef>(null);
  const imageBlockIndex = useRef<number | null>(null);
  const blocks = value?.blocks ?? [];

  const emit = (next: EditorBlock[]) => onChange({ blocks: next });

  const updateBlock = (index: number, block: EditorBlock) => {
    const next = blocks.slice();
    next[index] = block;
    emit(next);
  };

  const addBlock = (type: EditorBlock['type']) => {
    emit([...blocks, emptyBlock(type)]);
  };

  const removeBlock = (index: number) => {
    emit(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = blocks.slice();
    [next[index], next[target]] = [next[target], next[index]];
    emit(next);
  };

  const onPickMediaForImage = (index: number) => {
    imageBlockIndex.current = index;
    pickerRef.current?.present();
  };

  const onMediaSelected = (media: Media) => {
    const idx = imageBlockIndex.current;
    if (idx == null) return;
    const block = blocks[idx];
    if (block?.type !== 'image') return;
    updateBlock(idx, {
      type: 'image',
      data: { mediaId: media.id, url: media.url, caption: block.data.caption ?? '' },
    });
    imageBlockIndex.current = null;
  };

  return (
    <View>
      {label ? (
        <Text className="mb-2 text-xs font-semibold text-ink-dim">{label}</Text>
      ) : null}

      {blocks.length === 0 ? (
        <View className="rounded-xl border border-dashed border-border bg-white px-4 py-6">
          <Text className="text-center text-sm text-ink-dim">
            Пока нет блоков. Добавьте первый внизу.
          </Text>
        </View>
      ) : null}

      <View className="gap-3">
        {blocks.map((block, index) => (
          <View
            key={index}
            className="rounded-xl border border-border bg-white p-3"
          >
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase text-greenman-7">
                {block.type === 'header'
                  ? 'Заголовок'
                  : block.type === 'paragraph'
                    ? 'Абзац'
                    : block.type === 'list'
                      ? 'Список'
                      : 'Изображение'}
              </Text>
              <View className="flex-row gap-1">
                <Pressable
                  onPress={() => moveBlock(index, -1)}
                  disabled={index === 0}
                  className={`h-8 w-8 items-center justify-center rounded-full ${index === 0 ? 'opacity-30' : 'active:bg-greenman-0'}`}
                >
                  <Ionicons name="arrow-up" size={16} color={greenman[7]} />
                </Pressable>
                <Pressable
                  onPress={() => moveBlock(index, 1)}
                  disabled={index === blocks.length - 1}
                  className={`h-8 w-8 items-center justify-center rounded-full ${index === blocks.length - 1 ? 'opacity-30' : 'active:bg-greenman-0'}`}
                >
                  <Ionicons name="arrow-down" size={16} color={greenman[7]} />
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert('Удалить блок?', undefined, [
                      { text: 'Отмена', style: 'cancel' },
                      {
                        text: 'Удалить',
                        style: 'destructive',
                        onPress: () => removeBlock(index),
                      },
                    ])
                  }
                  className="h-8 w-8 items-center justify-center rounded-full active:bg-red-50"
                >
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                </Pressable>
              </View>
            </View>

            {block.type === 'paragraph' ? (
              <TextInput
                multiline
                placeholder="Текст абзаца…"
                placeholderTextColor="#9ca3af"
                value={block.data.text}
                onChangeText={(v) =>
                  updateBlock(index, { type: 'paragraph', data: { text: v } })
                }
                className="min-h-[80px] text-base text-ink"
                style={{ textAlignVertical: 'top' }}
              />
            ) : block.type === 'header' ? (
              <View>
                <View className="mb-2 flex-row gap-2">
                  {[1, 2, 3].map((lvl) => (
                    <Pressable
                      key={lvl}
                      onPress={() =>
                        updateBlock(index, {
                          type: 'header',
                          data: { text: block.data.text, level: lvl as 1 | 2 | 3 },
                        })
                      }
                      className={`rounded-full px-3 py-1 ${block.data.level === lvl ? 'bg-greenman-7' : 'bg-greenman-0'}`}
                    >
                      <Text
                        className={`text-xs font-semibold ${block.data.level === lvl ? 'text-white' : 'text-greenman-8'}`}
                      >
                        H{lvl}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  placeholder="Текст заголовка…"
                  placeholderTextColor="#9ca3af"
                  value={block.data.text}
                  onChangeText={(v) =>
                    updateBlock(index, {
                      type: 'header',
                      data: { text: v, level: block.data.level },
                    })
                  }
                  className="text-xl font-display text-ink"
                />
              </View>
            ) : block.type === 'list' ? (
              <View>
                <View className="mb-2 flex-row gap-2">
                  {(['unordered', 'ordered'] as const).map((s) => (
                    <Pressable
                      key={s}
                      onPress={() =>
                        updateBlock(index, {
                          type: 'list',
                          data: { style: s, items: block.data.items },
                        })
                      }
                      className={`rounded-full px-3 py-1 ${block.data.style === s ? 'bg-greenman-7' : 'bg-greenman-0'}`}
                    >
                      <Text
                        className={`text-xs font-semibold ${block.data.style === s ? 'text-white' : 'text-greenman-8'}`}
                      >
                        {s === 'ordered' ? '1.' : '•'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {block.data.items.map((item, i) => (
                  <View key={i} className="mb-1 flex-row items-center gap-2">
                    <Text className="w-5 text-ink-dim">
                      {block.data.style === 'ordered' ? `${i + 1}.` : '•'}
                    </Text>
                    <TextInput
                      placeholder="Пункт списка…"
                      placeholderTextColor="#9ca3af"
                      value={item}
                      onChangeText={(v) => {
                        const items = block.data.items.slice();
                        items[i] = v;
                        updateBlock(index, {
                          type: 'list',
                          data: { style: block.data.style, items },
                        });
                      }}
                      className="flex-1 text-base text-ink"
                    />
                    <Pressable
                      onPress={() => {
                        const items = block.data.items.filter((_, j) => j !== i);
                        updateBlock(index, {
                          type: 'list',
                          data: {
                            style: block.data.style,
                            items: items.length ? items : [''],
                          },
                        });
                      }}
                    >
                      <Ionicons name="close" size={18} color="#9ca3af" />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={() =>
                    updateBlock(index, {
                      type: 'list',
                      data: {
                        style: block.data.style,
                        items: [...block.data.items, ''],
                      },
                    })
                  }
                  className="mt-1 flex-row items-center gap-1"
                >
                  <Ionicons name="add" size={16} color={greenman[7]} />
                  <Text className="text-sm font-semibold text-greenman-7">Пункт</Text>
                </Pressable>
              </View>
            ) : block.type === 'image' ? (
              <View>
                {block.data.url ? (
                  <Image
                    source={{ uri: block.data.url }}
                    style={{ width: '100%', height: 180, borderRadius: 12 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="h-40 items-center justify-center rounded-xl bg-greenman-0">
                    <Ionicons name="image-outline" size={28} color={greenman[7]} />
                    <Text className="mt-1 text-xs text-ink-dim">Картинка не выбрана</Text>
                  </View>
                )}

                {!block.data.url ? (
                  <ImageBlockPicker
                    onMediaChange={(m) =>
                      updateBlock(index, {
                        type: 'image',
                        data: { mediaId: m.id, url: m.url, caption: block.data.caption ?? '' },
                      })
                    }
                    onPickFromLibrary={() => onPickMediaForImage(index)}
                  />
                ) : (
                  <View className="mt-2 flex-row gap-2">
                    <Pressable
                      onPress={() => onPickMediaForImage(index)}
                      className="flex-row items-center gap-1 rounded-full bg-greenman-0 px-3 py-1.5"
                    >
                      <Ionicons name="images-outline" size={14} color={greenman[7]} />
                      <Text className="text-xs font-semibold text-greenman-7">Из библиотеки</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        updateBlock(index, {
                          type: 'image',
                          data: { mediaId: 0, url: '', caption: block.data.caption ?? '' },
                        })
                      }
                      className="flex-row items-center gap-1 rounded-full bg-red-50 px-3 py-1.5"
                    >
                      <Ionicons name="close" size={14} color="#dc2626" />
                      <Text className="text-xs font-semibold text-red-600">Убрать</Text>
                    </Pressable>
                  </View>
                )}

                <TextInput
                  placeholder="Подпись (необязательно)"
                  placeholderTextColor="#9ca3af"
                  value={block.data.caption ?? ''}
                  onChangeText={(v) =>
                    updateBlock(index, {
                      type: 'image',
                      data: { mediaId: block.data.mediaId, url: block.data.url, caption: v },
                    })
                  }
                  className="mt-2 text-sm text-ink-dim"
                />
              </View>
            ) : null}
          </View>
        ))}
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <AddButton icon="text-outline" label="Абзац" onPress={() => addBlock('paragraph')} />
        <AddButton icon="chevron-up-outline" label="Заголовок" onPress={() => addBlock('header')} />
        <AddButton icon="list-outline" label="Список" onPress={() => addBlock('list')} />
        <AddButton icon="image-outline" label="Изображение" onPress={() => addBlock('image')} />
      </View>

      <MediaGridPicker ref={pickerRef} accept="image" onSelect={onMediaSelected} />
    </View>
  );
}

function ImageBlockPicker({
  onMediaChange,
  onPickFromLibrary,
}: {
  onMediaChange: (m: Media) => void;
  onPickFromLibrary: () => void;
}) {
  return (
    <View className="mt-2 flex-row gap-2">
      <View className="flex-1">
        <MediaPicker
          accept="image"
          multiple={false}
          value={[]}
          onChange={(arr) => {
            if (arr[0]) onMediaChange(arr[0]);
          }}
        />
      </View>
      <Pressable
        onPress={onPickFromLibrary}
        className="h-20 w-20 items-center justify-center rounded-xl border border-border bg-greenman-0 active:opacity-70"
      >
        <Ionicons name="folder-open-outline" size={22} color={greenman[7]} />
        <Text className="mt-0.5 text-[10px] text-ink-dim">Из библиотеки</Text>
      </Pressable>
    </View>
  );
}

function AddButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1.5 rounded-full bg-greenman-0 px-3 py-2 active:opacity-70"
    >
      <Ionicons name={icon} size={14} color={greenman[7]} />
      <Text className="text-xs font-semibold text-greenman-7">{label}</Text>
    </Pressable>
  );
}
