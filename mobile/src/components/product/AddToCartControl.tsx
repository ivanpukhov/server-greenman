import { useCallback, useMemo, useRef } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/stores/cart.store';
import { useCountryStore } from '@/stores/country.store';
import { formatPrice } from '@/lib/format/price';
import type { Product, ProductType } from '@/lib/api/types';

type Props = {
  product: Product;
};

export function AddToCartControl({ product }: Props) {
  const currency = useCountryStore((s) => s.currency);
  const add = useCartStore((s) => s.add);
  const sheetRef = useRef<BottomSheetModal>(null);

  const types = product.types ?? [];
  const hasMultiple = types.length > 1;
  const singleType = types.length === 1 ? types[0] : null;

  const addType = useCallback(
    (t: ProductType) => {
      add(
        {
          productId: product.id,
          productName: product.name,
          type: { id: t.id, type: t.type, price: t.price },
        },
        1
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Toast.show({ type: 'success', text1: 'Добавлено в корзину', text2: `${product.name} · ${t.type}` });
    },
    [add, product.id, product.name]
  );

  const onPress = () => {
    if (!types.length) return;
    if (singleType) {
      addType(singleType);
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    sheetRef.current?.present();
  };

  const renderBackdrop = useCallback(
    // @ts-expect-error — props typing from gorhom is loose
    (p) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  const label = useMemo(() => {
    if (!types.length) return 'Нет в наличии';
    if (singleType) return `В корзину · ${formatPrice(singleType.price, currency)}`;
    return 'Выбрать и добавить';
  }, [types.length, singleType, currency]);

  return (
    <>
      <Button
        label={label}
        size="lg"
        disabled={!types.length}
        onPress={onPress}
      />
      {hasMultiple ? (
        <BottomSheetModal
          ref={sheetRef}
          snapPoints={[Math.min(440, 80 + types.length * 72)]}
          backdropComponent={renderBackdrop}
          enablePanDownToClose
        >
          <BottomSheetView>
            <View className="px-5 pb-8 pt-2">
              <Text className="text-xl font-display text-ink">{product.name}</Text>
              <Text className="mt-1 text-sm text-ink-dim">Выберите вариант</Text>
              <View className="mt-4 gap-2">
                {types.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      sheetRef.current?.dismiss();
                      addType(t);
                    }}
                    className="flex-row items-center justify-between rounded-xl border border-border bg-white p-4 active:bg-greenman-0"
                  >
                    <Text className="flex-1 text-base text-ink">{t.type}</Text>
                    <Text className="text-base font-bold text-greenman-8">
                      {formatPrice(t.price, currency)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </BottomSheetView>
        </BottomSheetModal>
      ) : null}
    </>
  );
}
