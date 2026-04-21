import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useAdminMediaList } from '@/hooks/admin/useAdminMedia';
import type { Media, MediaKind } from '@/lib/api/admin-types';
import { greenman } from '@/theme/colors';

type Props = {
  accept?: MediaKind | 'all';
  onSelect: (media: Media) => void;
};

export type MediaGridPickerRef = {
  present: () => void;
  dismiss: () => void;
};

export const MediaGridPicker = forwardRef<MediaGridPickerRef, Props>(function MediaGridPicker(
  { accept = 'all', onSelect },
  ref
) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [filter, setFilter] = useState<MediaKind | 'all'>(accept);
  const list = useAdminMediaList(filter === 'all' ? {} : { type: filter });

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const filters: { label: string; value: MediaKind | 'all' }[] = [
    { label: 'Все', value: 'all' },
    { label: 'Фото', value: 'image' },
    { label: 'Видео', value: 'video' },
    { label: 'Аудио', value: 'audio' },
    { label: 'Файлы', value: 'file' },
  ];

  return (
    <Sheet ref={sheetRef} title="Выбрать из библиотеки" snapPoints={['75%']}>
      <View className="flex-row flex-wrap gap-2 pb-3">
        {filters.map((f) => {
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
      {list.isLoading ? (
        <View className="py-10 items-center">
          <ActivityIndicator color={greenman[7]} />
        </View>
      ) : (
        <FlatList
          data={list.data ?? []}
          keyExtractor={(m) => String(m.id)}
          numColumns={3}
          columnWrapperStyle={{ gap: 8 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onSelect(item);
                sheetRef.current?.dismiss();
              }}
              className="flex-1 aspect-square overflow-hidden rounded-xl border border-border bg-greenman-0"
            >
              {item.type === 'image' ? (
                <Image source={{ uri: item.url }} style={{ flex: 1 }} contentFit="cover" />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Ionicons
                    name={
                      item.type === 'video'
                        ? 'videocam'
                        : item.type === 'audio'
                          ? 'musical-notes'
                          : 'document'
                    }
                    size={24}
                    color={greenman[7]}
                  />
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </Sheet>
  );
});
