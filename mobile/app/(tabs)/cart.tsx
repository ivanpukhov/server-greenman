import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CartItemRow } from '@/components/cart/CartItemRow';
import { useCartStore } from '@/stores/cart.store';
import { useCountryStore } from '@/stores/country.store';
import { useAuthStore } from '@/stores/auth.store';
import { formatPrice } from '@/lib/format/price';

export default function CartScreen() {
  const items = useCartStore((s) => s.items);
  const currency = useCountryStore((s) => s.currency);
  const subtotal = useCartStore((s) => s.subtotal());
  const count = useCartStore((s) => s.count());
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goCheckout = () => {
    if (!isAuth) {
      router.push('/auth/phone');
      return;
    }
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-greenman-0">
            <Ionicons name="bag-outline" size={48} color="#007d38" />
          </View>
          <Text className="mt-6 text-xl font-display text-ink">Корзина пока пуста</Text>
          <Text className="mt-2 text-center text-sm text-ink-dim">
            Загляните в каталог — найдём средство, которое подойдёт именно вам.
          </Text>
          <Button
            label="В каталог"
            className="mt-8 w-full"
            onPress={() => router.push('/catalog')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View className="px-5 pb-3 pt-4">
        <Text className="text-2xl font-display text-ink">Корзина</Text>
        <Text className="mt-1 text-sm text-ink-dim">
          {count === 1 ? '1 позиция' : `${count} позиций`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 200 + insets.bottom }}>
        <View className="gap-2">
          {items.map((item) => (
            <CartItemRow key={`${item.productId}-${item.type.id}`} item={item} />
          ))}
        </View>

        <Card variant="tonal" className="mt-6" padded>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-ink-dim">Подытог</Text>
            <Text className="text-base font-semibold text-ink">
              {formatPrice(subtotal, currency)}
            </Text>
          </View>
          <View className="mt-3 flex-row items-start gap-2">
            <Ionicons name="information-circle-outline" size={16} color="#5b6360" />
            <Text className="flex-1 text-xs text-ink-dim">
              Стоимость доставки рассчитаем на следующем шаге — после выбора способа и города.
            </Text>
          </View>
        </Card>

        <View className="mt-4 rounded-xl border border-border bg-white p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="shield-checkmark-outline" size={18} color="#007d38" />
            <Text className="text-sm font-semibold text-ink">Видеообзор перед отправкой</Text>
          </View>
          <Text className="mt-1 text-xs text-ink-dim">
            Перед отправкой вы получите видео вашего заказа в WhatsApp — так вы будете уверены в составе и сроках.
          </Text>
        </View>
      </ScrollView>

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-5 pt-4 shadow-pop"
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm text-ink-dim">Итого</Text>
          <Text className="text-2xl font-display text-ink">{formatPrice(subtotal, currency)}</Text>
        </View>
        <Button label="Оформить заказ" size="lg" onPress={goCheckout} />
      </View>
    </Screen>
  );
}
