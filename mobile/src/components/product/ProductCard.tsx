import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { memo } from 'react';
import Toast from 'react-native-toast-message';
import { Text } from '@/components/ui/Text';
import { ProductPlaceholder } from '@/components/ui/ProductPlaceholder';
import { useCountryStore } from '@/stores/country.store';
import { useCartStore } from '@/stores/cart.store';
import { formatPrice } from '@/lib/format/price';
import type { Product } from '@/lib/api/types';

type Props = {
  product: Product;
};

function minPrice(product: Product): number | null {
  const types = product.types ?? [];
  if (!types.length) return null;
  return types.reduce((min, t) => (t.price < min ? t.price : min), types[0].price);
}

function ProductCardInner({ product }: Props) {
  const router = useRouter();
  const currency = useCountryStore((s) => s.currency);
  const add = useCartStore((s) => s.add);
  const items = useCartStore((s) => s.items);

  const price = minPrice(product);
  const hasMultiple = (product.types?.length ?? 0) > 1;
  const types = product.types ?? [];
  const inCart = items.some((i) => i.productId === product.id);

  const goDetail = () => {
    router.push(`/product/${product.id}`);
  };

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
      { productId: product.id, productName: product.name, type: { id: t.id, type: t.type, price: t.price } },
      1
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Toast.show({ type: 'success', text1: 'Добавлено', text2: `${product.name} · ${t.type}` });
  };

  return (
    <View className="flex-1">
      <Pressable
        onPress={goDetail}
        className="overflow-hidden rounded-xl border border-border bg-white active:opacity-90"
      >
        <View className="relative aspect-square">
          <ProductPlaceholder
            name={product.name}
            alias={product.alias ?? undefined}
            size="card"
            className="h-full w-full"
          />
          {types.length > 0 ? (
            inCart ? (
              <Pressable
                accessibilityLabel="Перейти в корзину"
                onPress={goCart}
                hitSlop={10}
                className="absolute bottom-2 right-2 h-9 flex-row items-center justify-center gap-1 rounded-full bg-greenman-7 px-3 shadow-soft active:opacity-80"
              >
                <Ionicons name="bag-handle" size={14} color="#fff" />
                <Text className="text-xs font-bold text-white">В корзине</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityLabel="Быстро добавить в корзину"
                onPress={quickAdd}
                hitSlop={10}
                className="absolute bottom-2 right-2 h-9 w-9 items-center justify-center rounded-full bg-white shadow-soft active:opacity-80"
              >
                <Ionicons name="add" size={20} color="#006e30" />
              </Pressable>
            )
          ) : null}
        </View>
        <View className="p-3">
          <Text className="text-sm font-semibold text-ink leading-5" numberOfLines={2}>
            {product.name}
          </Text>
          {price != null ? (
            <Text className="mt-2 text-base font-display text-greenman-8">
              {hasMultiple ? `от ${formatPrice(price, currency)}` : formatPrice(price, currency)}
            </Text>
          ) : (
            <Text className="mt-2 text-sm text-ink-dim">Нет в наличии</Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}

export const ProductCard = memo(ProductCardInner);
