import { View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useCartStore } from '@/stores/cart.store';
import { greenman, sand, semantic } from '@/theme/colors';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { off: IconName; on: IconName; label: string }> = {
  index: { off: 'sparkles-outline', on: 'sparkles', label: 'Главная' },
  catalog: { off: 'leaf-outline', on: 'leaf', label: 'Каталог' },
  feed: { off: 'compass-outline', on: 'compass', label: 'Лента' },
  cart: { off: 'bag-outline', on: 'bag', label: 'Корзина' },
  profile: { off: 'person-outline', on: 'person', label: 'Профиль' },
};

function TabButton({
  focused,
  name,
  onPress,
  badge,
}: {
  focused: boolean;
  name: string;
  onPress: () => void;
  badge?: number;
}) {
  const meta = ICONS[name] ?? { off: 'ellipse-outline' as IconName, on: 'ellipse' as IconName, label: name };
  const pulse = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    pulse.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 200 });
  }, [focused, pulse]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.94 + pulse.value * 0.06 }],
    opacity: pulse.value,
  }));

  const iconLift = useAnimatedStyle(() => ({
    transform: [{ translateY: -pulse.value }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (!focused) Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      haptic="none"
      scale={0.92}
      wrapperClassName="flex-1 items-center justify-center"
    >
      <View className="h-9 w-12 items-center justify-center">
        <Animated.View
          style={bubbleStyle}
          className="absolute h-9 w-12 rounded-pill bg-greenman-0"
        />
        <Animated.View style={iconLift}>
          <Ionicons
            name={focused ? meta.on : meta.off}
            size={21}
            color={focused ? greenman[8] : sand[4]}
          />
        </Animated.View>
        {badge && badge > 0 ? (
          <View className="absolute -right-1 -top-1 min-w-[18px] h-[18px] items-center justify-center rounded-pill bg-clay-5 px-1">
            <Text className="text-[10px] font-bold text-white" tracking="tight">
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        className={`mt-1 text-[10px] ${focused ? 'font-bold text-greenman-8' : 'font-semibold text-ink/45'}`}
        tracking="tight"
        numberOfLines={1}
      >
        {meta.label}
      </Text>
    </AnimatedPressable>
  );
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: semantic.border,
      }}
    >
      <View>
        <View
          className="flex-row items-center justify-between px-2 pt-2"
          style={{ paddingBottom: Math.max(insets.bottom, 8) }}
        >
          {state.routes.map((route, idx) => {
            const focused = state.index === idx;
            const badge = route.name === 'cart' ? cartCount : undefined;
            return (
              <TabButton
                key={route.key}
                focused={focused}
                name={route.name}
                badge={badge}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name as never);
                  }
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}
