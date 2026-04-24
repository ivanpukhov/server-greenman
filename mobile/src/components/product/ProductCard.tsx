import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { memo } from 'react';
import Toast from 'react-native-toast-message';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { IconButton } from '@/components/ui/IconButton';
import { ProductPlaceholder } from '@/components/ui/ProductPlaceholder';
import { useCountryStore } from '@/stores/country.store';
import { useCartStore } from '@/stores/cart.store';
import { formatPrice } from '@/lib/format/price';
import { shadows } from '@/theme/shadows';
import { greenman } from '@/theme/colors';
import type { Product } from '@/lib/api/types';

type Variant = 'grid' | 'rail' | 'compact' | 'hero';

type Props = {
  product: Product;
  variant?: Variant;
  width?: number;
};

function minPrice(product: Product): number | null {
  const types = product.types ?? [];
  if (!types.length) return null;
  return types.reduce((min, t) => (t.price < min ? t.price : min), types[0].price);
}

function ProductCardInner({ product, variant = 'grid', width }: Props) {
  const router = useRouter();
  const currency = useCountryStore((s) => s.currency);
  const add = useCartStore((s) => s.add);
  const items = useCartStore((s) => s.items);

  const price = minPrice(product);
  const hasMultiple = (product.types?.length ?? 0) > 1;
  const types = product.types ?? [];
  const inCart = items.some((i) => i.productId === product.id);

  const goDetail = () => router.push(`/product/${product.id}`);
  const goCart = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/cart');
  };

  const quickAdd = () => {
    if (!types.length) return;
    if (hasMultiple) {
      goDetail();
      return;
    }
    const t = types[0];
    add(
      {
        productId: product.id,
        productName: product.name,
        type: { id: t.id, type: t.type, price: t.price },
      },
      1,
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Toast.show({ type: 'success', text1: 'Добавлено', text2: `${product.name} · ${t.type}` });
  };

  if (variant === 'rail' || variant === 'compact' || variant === 'hero') {
    const cardW = width ?? (variant === 'hero' ? 260 : variant === 'compact' ? 150 : 180);
    const imgH = variant === 'hero' ? 260 : variant === 'compact' ? 150 : 180;

    return (
      <AnimatedPressable
        onPress={goDetail}
        haptic="selection"
        scale={0.97}
        wrapperStyle={[{ width: cardW }, shadows.soft]}
        className="rounded-lg overflow-hidden bg-surface"
      >
        <View style={{ width: cardW, height: imgH }} className="relative bg-sand-1">
          <ProductPlaceholder
            name={product.name}
            alias={product.alias ?? undefined}
            size="card"
            className="h-full w-full"
          />
          <View className="absolute left-3 top-3 flex-row gap-1.5">
            <View className="rounded-pill bg-ink/80 px-2.5 py-1">
              <Text
                className="text-[10px] font-bold uppercase text-white"
                tracking="wide"
              >
                Топ
              </Text>
            </View>
          </View>
          <View className="absolute bottom-3 right-3">
            {types.length > 0 ? (
              inCart ? (
                <IconButton
                  icon={<Ionicons name="bag-handle" size={18} color="#fff" />}
                  tone="filled"
                  size="md"
                  elevated
                  onPress={goCart}
                  accessibilityLabel="Перейти в корзину"
                />
              ) : (
                <IconButton
                  icon={<Ionicons name="add" size={22} color={greenman[9]} />}
                  tone="inverse"
                  size="md"
                  elevated
                  onPress={quickAdd}
                  accessibilityLabel="Добавить в корзину"
                />
              )
            ) : null}
          </View>
        </View>
        <View className="gap-1 p-4">
          <Text
            className="font-semibold text-[14px] leading-[18px] text-ink"
            numberOfLines={2}
          >
            {product.name}
          </Text>
          {price != null ? (
            <View className="mt-1 flex-row items-baseline gap-1">
              {hasMultiple ? (
                <Text
                  className="text-[10px] font-bold uppercase text-ink-muted"
                  tracking="wide"
                >
                  от
                </Text>
              ) : null}
              <Text
                className="font-display text-[20px] leading-[22px] text-ink"
                tracking="tight"
              >
                {formatPrice(price, currency)}
              </Text>
            </View>
          ) : (
            <Text className="text-[12px] text-ink-muted">Нет в наличии</Text>
          )}
        </View>
      </AnimatedPressable>
    );
  }

  // GRID variant — 2-col
  return (
    <View className="flex-1">
      <AnimatedPressable
        onPress={goDetail}
        haptic="selection"
        scale={0.97}
        wrapperStyle={shadows.flat}
        className="overflow-hidden rounded-lg bg-surface"
      >
        <View className="relative aspect-[4/5] bg-sand-1">
          <ProductPlaceholder
            name={product.name}
            alias={product.alias ?? undefined}
            size="card"
            className="h-full w-full"
          />
          <View className="absolute bottom-2.5 right-2.5">
            {types.length > 0 ? (
              inCart ? (
                <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
                  <AnimatedPressable
                    onPress={goCart}
                    haptic="selection"
                    wrapperStyle={shadows.soft}
                    className="h-9 flex-row items-center gap-1 rounded-pill bg-greenman-8 px-3"
                  >
                    <Ionicons name="bag-handle" size={13} color="#fff" />
                    <Text
                      className="text-[11px] font-bold text-white"
                      tracking="tight"
                    >
                      В корзине
                    </Text>
                  </AnimatedPressable>
                </Animated.View>
              ) : (
                <Animated.View entering={FadeIn.duration(180)}>
                  <AnimatedPressable
                    onPress={quickAdd}
                    haptic="success"
                    wrapperStyle={shadows.float}
                    className="h-9 w-9 items-center justify-center rounded-pill bg-white"
                  >
                    <Ionicons name="add" size={20} color={greenman[9]} />
                  </AnimatedPressable>
                </Animated.View>
              )
            ) : null}
          </View>
        </View>
        <View className="gap-1 px-3 pb-4 pt-3">
          <Text
            className="text-[13px] leading-[17px] font-semibold text-ink"
            numberOfLines={2}
          >
            {product.name}
          </Text>
          {price != null ? (
            <View className="mt-0.5 flex-row items-baseline gap-1">
              {hasMultiple ? (
                <Text
                  className="text-[10px] font-bold uppercase text-ink-muted"
                  tracking="wide"
                >
                  от
                </Text>
              ) : null}
              <Text
                className="font-display text-[18px] leading-[20px] text-ink"
                tracking="tight"
              >
                {formatPrice(price, currency)}
              </Text>
            </View>
          ) : (
            <Text className="text-[11px] text-ink-muted">Нет в наличии</Text>
          )}
        </View>
      </AnimatedPressable>
    </View>
  );
}

export const ProductCard = memo(ProductCardInner);
