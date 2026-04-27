import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '@/stores/cart.store';
import { Text } from './Text';
import { AnimatedPressable } from './AnimatedPressable';
import { shadows } from '@/theme/shadows';

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
      <AnimatedPressable
        onPress={() => {
          router.push('/cart');
        }}
        haptic="light"
        scale={0.94}
        accessibilityLabel="Открыть корзину"
        accessibilityRole="button"
        wrapperStyle={shadows.glow}
        className="h-14 w-14 items-center justify-center rounded-full bg-greenman-7"
      >
        <Ionicons name="bag-handle" size={24} color="#fff" />
        <View className="absolute -right-1 -top-1 min-w-5 items-center justify-center rounded-pill bg-sun-2 px-1.5 py-0.5">
          <Text className="text-[11px] font-bold text-ink">{cartCount}</Text>
        </View>
      </AnimatedPressable>
    </View>
  );
}
