import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '@/stores/cart.store';
import { Text } from './Text';

type Props = {
  bottomOffset?: number;
  hidden?: boolean;
};

export function FloatingCartButton({ bottomOffset = 112, hidden }: Props) {
  const router = useRouter();
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  if (cartCount === 0 || hidden) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', right: 16, bottom: bottomOffset }}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          router.push('/cart');
        }}
        accessibilityLabel="Открыть корзину"
        accessibilityRole="button"
        className="h-12 flex-row items-center rounded-lg bg-greenman-7 pl-4 pr-4 shadow-pop active:opacity-90"
      >
        <Ionicons name="bag-handle" size={22} color="#fff" />
        <Text className="ml-2 text-sm font-bold text-white">Корзина</Text>
        <View className="ml-3 min-w-6 items-center justify-center rounded-full bg-white px-2 py-0.5">
          <Text className="text-xs font-bold text-greenman-8">{cartCount}</Text>
        </View>
      </Pressable>
    </View>
  );
}
