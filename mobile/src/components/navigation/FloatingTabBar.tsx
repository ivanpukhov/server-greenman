import { View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { shadows } from '@/theme/shadows';
import { useCartStore } from '@/stores/cart.store';

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
    transform: [{ scale: 0.86 + pulse.value * 0.18 }],
    opacity: 0.15 + pulse.value * 0.85,
  }));

  const iconLift = useAnimatedStyle(() => ({
    transform: [{ translateY: -pulse.value * 2 }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (!focused) Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      haptic="none"
      scale={0.88}
      wrapperClassName="flex-1 items-center justify-center"
    >
      <View className="h-14 w-14 items-center justify-center">
        <Animated.View
          style={bubbleStyle}
          className="absolute h-11 w-11 rounded-pill bg-white"
        />
        <Animated.View style={iconLift}>
          <Ionicons
            name={focused ? meta.on : meta.off}
            size={focused ? 22 : 22}
            color={focused ? '#04401d' : 'rgba(255,255,255,0.66)'}
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
        className={`mt-0.5 text-[10px] ${focused ? 'font-bold text-white' : 'font-semibold text-white/50'}`}
        tracking="wide"
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
      }}
    >
      <View
        className="overflow-hidden rounded-t-xl"
        style={shadows.float}
      >
        <LinearGradient
          colors={['#05210f', '#0b2a17', '#04401d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View
            className="flex-row items-center justify-between px-2 pt-2"
            style={{ paddingBottom: Math.max(insets.bottom, 10) }}
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
        </LinearGradient>
      </View>
    </View>
  );
}
