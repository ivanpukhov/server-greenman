import { View, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StickyCTA } from '@/components/ui/StickyCTA';
import { CartItemRow } from '@/components/cart/CartItemRow';
import { useCartStore } from '@/stores/cart.store';
import { useCountryStore } from '@/stores/country.store';
import { useAuthStore } from '@/stores/auth.store';
import { formatPrice } from '@/lib/format/price';
import { shadows } from '@/theme/shadows';

export default function CartScreen() {
  const items = useCartStore((s) => s.items);
  const currency = useCountryStore((s) => s.currency);
  const subtotal = useCartStore((s) => s.subtotal());
  const count = useCartStore((s) => s.count());
  const clear = useCartStore((s) => s.clear);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 58 + Math.max(insets.bottom, 8);

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
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-40 w-40 items-center justify-center rounded-full bg-greenman-0">
            <Ionicons name="bag-outline" size={48} color="#007d38" />
          </View>
          <Text className="mt-6 font-display text-[22px] leading-[28px] text-ink">
            Корзина пуста
          </Text>
          <Text className="mt-2 text-center text-[15px] leading-[22px] text-ink/60">
            Найдите травы и сборы, которые нужны сейчас.
          </Text>
          <Button
            label="В каталог"
            size="lg"
            full
            className="mt-8"
            iconRight={<Ionicons name="arrow-forward" size={16} color="#ffffff" />}
            onPress={() => router.push('/catalog')}
          />
          <Button
            label="Главная"
            variant="ghost"
            size="md"
            full
            className="mt-2"
            onPress={() => router.push('/')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View className="border-b border-border bg-white px-4 pb-3 pt-4">
        <View className="h-11 flex-row items-center justify-between">
          <View className="w-20" />
          <Text className="text-[17px] font-semibold text-ink">Корзина</Text>
          <Button
            label="Очистить"
            variant="ghost"
            size="sm"
            onPress={() => {
              Alert.alert('Очистить корзину?', 'Все товары будут удалены.', [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Очистить', style: 'destructive', onPress: clear },
              ]);
            }}
          />
        </View>
        <Text variant="meta-upper" className="mt-1 text-ink/50" tracking="wide">
          {count} товаров на сумму {formatPrice(subtotal, currency)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 180 }}>
        <View className="bg-white">
          {items.map((item) => (
            <CartItemRow key={`${item.productId}-${item.type.id}`} item={item} />
          ))}
        </View>

        <Card variant="sand" className="mx-4 mt-4" padded="sm">
          <View className="flex-row items-center gap-3">
            <Ionicons name="ticket-outline" size={20} color="rgba(5,33,15,0.4)" />
            <Text className="flex-1 text-[15px] font-medium text-ink/40">Промокод</Text>
            <Text className="text-[11px] font-semibold uppercase text-ink/40">Скоро</Text>
          </View>
        </Card>

        <View className="mx-4 mt-4 rounded-md border border-border bg-white p-4" style={shadows.flat}>
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-semibold text-ink">Доставка</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(5,33,15,0.4)" />
          </View>
          <Text className="mt-1 text-[13px] leading-[18px] text-ink/60">
            Способ выберете на следующем шаге.
          </Text>
        </View>

        <View className="mx-4 mt-4 rounded-md border border-border bg-white p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="shield-checkmark-outline" size={18} color="#007d38" />
            <Text className="text-sm font-semibold text-ink">Видеообзор перед отправкой</Text>
          </View>
          <Text className="mt-1 text-xs text-ink-dim">
            Перед отправкой вы получите видео вашего заказа в WhatsApp — так вы будете уверены в составе и сроках.
          </Text>
        </View>
      </ScrollView>

      <StickyCTA
        bottomOffset={tabBarHeight}
        topSlot={
          <View className="gap-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] text-ink/60">Товары ({count})</Text>
              <Text className="text-[13px] font-semibold text-ink">{formatPrice(subtotal, currency)}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] text-ink/60">Доставка</Text>
              <Text className="text-[13px] text-ink/60">На след. шаге</Text>
            </View>
            <View className="mt-1 h-px bg-border" />
            <View className="flex-row items-center justify-between">
              <Text className="text-[17px] font-semibold text-ink">Итого</Text>
              <Text className="font-display text-[22px] leading-[28px] text-ink">
                {formatPrice(subtotal, currency)}
              </Text>
            </View>
          </View>
        }
      >
        <Button
          label="Перейти к оформлению"
          size="lg"
          full
          onPress={goCheckout}
          iconRight={<Ionicons name="arrow-forward" size={18} color="#fff" />}
        />
      </StickyCTA>
    </Screen>
  );
}
