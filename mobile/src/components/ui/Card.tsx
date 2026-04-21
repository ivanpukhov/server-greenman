import { Pressable, View, ViewProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { cssInterop } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';

cssInterop(View, { className: 'style' });
cssInterop(Animated.View, { className: 'style' });

type Variant = 'flat' | 'elevated' | 'outline' | 'tonal';

type Props = ViewProps & {
  variant?: Variant;
  padded?: boolean;
  pressable?: boolean;
  onPress?: () => void;
  haptic?: boolean;
  className?: string;
  children: ReactNode;
};

const variants: Record<Variant, string> = {
  flat: 'bg-white',
  elevated: 'bg-white shadow-soft',
  outline: 'bg-white border border-border',
  tonal: 'bg-greenman-0',
};

export function Card({
  variant = 'flat',
  padded = true,
  pressable,
  onPress,
  haptic = true,
  className,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const base = `rounded-xl ${variants[variant]} ${padded ? 'p-4' : ''} ${className ?? ''}`;

  if (!pressable) {
    return (
      <View className={base} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 300 });
        }}
        onPress={() => {
          if (haptic) Haptics.selectionAsync().catch(() => {});
          onPress?.();
        }}
        className={base}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
