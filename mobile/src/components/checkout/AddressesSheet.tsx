import { forwardRef, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Text } from '@/components/ui/Text';
import type { OrderProfile } from '@/lib/api/types';

type Props = {
  profiles: OrderProfile[];
  onPick: (profile: OrderProfile) => void;
  onDismiss?: () => void;
};

export const AddressesSheet = forwardRef<BottomSheetModal, Props>(function AddressesSheet(
  { profiles, onPick, onDismiss },
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
      snapPoints={[Math.min(520, 120 + profiles.length * 80)]}
      backdropComponent={renderBackdrop}
      onDismiss={onDismiss}
      enablePanDownToClose
    >
      <BottomSheetView>
        <View className="px-5 pb-8 pt-2">
          <Text className="text-xl font-display text-ink">Сохранённые адреса</Text>
          <Text className="mt-1 text-sm text-ink-dim">Выберите адрес или продолжите ручной ввод.</Text>
          <View className="mt-4 gap-2">
            {profiles.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => onPick(p)}
                className="rounded-xl border border-border bg-white p-4 active:bg-greenman-0"
              >
                <Text className="text-base font-semibold text-ink">{p.name}</Text>
                <Text className="mt-1 text-sm text-ink-dim">
                  {p.city}
                  {p.street ? `, ${p.street}` : ''}
                  {p.houseNumber ? `, ${p.houseNumber}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
