import { Pressable, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { ProductPlaceholder } from '@/components/ui/ProductPlaceholder';
import { useCartStore, type CartItem } from '@/stores/cart.store';
import { useCountryStore } from '@/stores/country.store';
import { formatPrice } from '@/lib/format/price';

type Props = { item: CartItem };

export function CartItemRow({ item }: Props) {
  const currency = useCountryStore((s) => s.currency);
  const remove = useCartStore((s) => s.remove);
  const updateQty = useCartStore((s) => s.updateQty);

  const renderRightActions = () => (
    <View className="my-1 w-24 items-center justify-center rounded-xl bg-red-500">
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text className="mt-1 text-xs font-bold text-white">Удалить</Text>
    </View>
  );

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      onSwipeableOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        remove(item.productId, item.type.id);
      }}
      friction={2}
      rightThreshold={60}
    >
      <View className="flex-row gap-3 rounded-xl border border-border bg-white p-3">
        <ProductPlaceholder
          name={item.productName}
          size="thumb"
          className="h-16 w-16 rounded-md"
        />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-ink" numberOfLines={2}>
            {item.productName}
          </Text>
          <Text className="mt-1 text-xs text-ink-dim" numberOfLines={1}>
            {item.type.type}
          </Text>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-base font-bold text-greenman-8">
              {formatPrice(item.type.price * item.quantity, currency)}
            </Text>
            <View className="flex-row items-center gap-1 rounded-full bg-greenman-0 px-1">
              <StepBtn
                icon="remove"
                accessibilityLabel="Уменьшить количество"
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  if (item.quantity > 1) updateQty(item.productId, item.type.id, item.quantity - 1);
                }}
                disabled={item.quantity <= 1}
              />
              <Text className="w-6 text-center text-sm font-semibold text-ink">
                {item.quantity}
              </Text>
              <StepBtn
                icon="add"
                accessibilityLabel="Увеличить количество"
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  updateQty(item.productId, item.type.id, item.quantity + 1);
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </Swipeable>
  );
}

function StepBtn({
  icon,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  icon: 'add' | 'remove';
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className={`h-8 w-8 items-center justify-center rounded-full ${disabled ? 'opacity-40' : 'active:bg-greenman-1'}`}
    >
      <Ionicons name={icon} size={16} color="#006e30" />
    </Pressable>
  );
}
