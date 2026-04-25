import { Pressable, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { Text } from '@/components/ui/Text';
import { ProductPlaceholder } from '@/components/ui/ProductPlaceholder';
import { useCartStore, type CartItem } from '@/stores/cart.store';
import { useCountryStore } from '@/stores/country.store';
import { formatPrice } from '@/lib/format/price';
import { shadows } from '@/theme/shadows';

type Props = { item: CartItem };

export function CartItemRow({ item }: Props) {
  const currency = useCountryStore((s) => s.currency);
  const remove = useCartStore((s) => s.remove);
  const updateQty = useCartStore((s) => s.updateQty);

  const removeItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    remove(item.productId, item.type.id);
    Toast.show({
      type: 'info',
      text1: 'Товар удалён',
      text2: item.productName,
    });
  };

  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          onPress={removeItem}
          accessibilityRole="button"
          accessibilityLabel="Удалить товар"
          className="my-1 ml-2 w-24 items-center justify-center rounded-lg bg-danger"
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text className="mt-1 text-[11px] font-semibold text-white">Удалить</Text>
        </Pressable>
      )}
      onSwipeableOpen={removeItem}
    >
      <View
        className="h-24 flex-row items-center bg-white px-4 py-3"
        style={shadows.flat}
      >
        <ProductPlaceholder
          name={item.productName}
          size="thumb"
          className="h-[72px] w-[72px] rounded-md"
        />
        <View className="min-w-0 flex-1 px-3">
          <Text className="text-[13px] font-semibold leading-[18px] text-ink" numberOfLines={2}>
            {item.productName}
          </Text>
          <View className="mt-1 self-start rounded-pill bg-sand-1 px-2 py-0.5">
            <Text className="text-[11px] font-semibold text-ink/70" numberOfLines={1}>
              {item.type.type}
            </Text>
          </View>
          <Text
            className="mt-1 font-display text-[15px] leading-[20px] text-ink"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatPrice(item.type.price * item.quantity, currency)}
            {item.quantity > 1 ? (
              <Text className="font-sans text-[11px] text-ink/50">
                {' '}· {item.quantity} шт
              </Text>
            ) : null}
          </Text>
        </View>
        <View className="h-8 flex-row items-center rounded-pill border border-ink/10 bg-white">
          <StepBtn
            icon={item.quantity <= 1 ? 'trash-outline' : 'remove'}
            danger={item.quantity <= 1}
            accessibilityLabel={item.quantity <= 1 ? 'Удалить товар' : 'Уменьшить количество'}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              if (item.quantity <= 1) removeItem();
              else updateQty(item.productId, item.type.id, item.quantity - 1);
            }}
          />
          <Text className="w-7 text-center text-[13px] font-semibold text-ink">
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
    </Swipeable>
  );
}

function StepBtn({
  icon,
  onPress,
  danger,
  accessibilityLabel,
}: {
  icon: 'add' | 'remove' | 'trash-outline';
  onPress: () => void;
  danger?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className="h-8 w-8 items-center justify-center rounded-full active:bg-greenman-1"
    >
      <Ionicons name={icon} size={16} color={danger ? '#c0392b' : '#05210f'} />
    </Pressable>
  );
}
