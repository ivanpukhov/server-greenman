import { Pressable, View, Alert } from 'react-native';
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

  const confirmRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert('Удалить товар?', item.productName, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => remove(item.productId, item.type.id) },
    ]);
  };

  return (
    <View className="flex-row gap-3 rounded-xl border border-border bg-white p-3">
      <ProductPlaceholder
        name={item.productName}
        size="thumb"
        className="h-16 w-16 rounded-md"
      />
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-ink" numberOfLines={2}>
          {item.productName}
        </Text>
        <Text className="mt-1 text-xs text-ink-dim" numberOfLines={1}>
          {item.type.type}
        </Text>
        <View className="mt-3 flex-row items-center justify-between gap-3">
          <Text
            className="flex-1 text-[15px] font-bold text-greenman-8"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatPrice(item.type.price * item.quantity, currency)}
          </Text>
          <View className="flex-row items-center gap-1 rounded-lg bg-greenman-0 px-1">
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
      <Pressable
        onPress={confirmRemove}
        accessibilityRole="button"
        accessibilityLabel="Удалить товар"
        className="h-9 w-9 items-center justify-center rounded-lg bg-sand-1 active:bg-red-50"
      >
        <Ionicons name="trash-outline" size={17} color="#8f2f2f" />
      </Pressable>
    </View>
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
