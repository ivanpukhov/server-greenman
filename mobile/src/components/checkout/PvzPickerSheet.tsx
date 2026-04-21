import { forwardRef, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import { Text } from '@/components/ui/Text';
import type { CdekPvz } from '@/lib/api/types';

type Props = {
  points: CdekPvz[];
  onPick: (pvz: CdekPvz) => void;
};

export const PvzPickerSheet = forwardRef<BottomSheetModal, Props>(function PvzPickerSheet(
  { points, onPick },
  ref
) {
  const renderBackdrop = useCallback(
    // @ts-expect-error — gorhom props typing
    (p) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['80%']}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
    >
      <View className="px-5 pb-2 pt-2">
        <Text className="text-xl font-display text-ink">Пункт выдачи СДЭК</Text>
        <Text className="mt-1 text-sm text-ink-dim">
          Выберите пункт. Оплата наличными при получении.
        </Text>
      </View>
      <BottomSheetFlatList
        data={points}
        keyExtractor={(p) => p.code}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 8 }}
        ListEmptyComponent={
          <View className="py-6">
            <Text className="text-center text-sm text-ink-dim">
              Для выбранного города нет доступных ПВЗ.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPick(item)}
            className="rounded-xl border border-border bg-white p-4 active:bg-greenman-0"
          >
            <Text className="text-base font-semibold text-ink">{item.name}</Text>
            <Text className="mt-1 text-sm text-ink-dim">
              {item.full_address || item.address}
            </Text>
            {item.work_time ? (
              <Text className="mt-1 text-xs text-ink-dim">График: {item.work_time}</Text>
            ) : null}
          </Pressable>
        )}
      />
    </BottomSheetModal>
  );
});
