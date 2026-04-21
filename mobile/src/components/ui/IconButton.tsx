import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';

type Variant = 'ghost' | 'filled' | 'tonal' | 'outline';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  icon: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  haptic?: boolean;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
};

const sizes: Record<Size, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
};

const variants: Record<Variant, string> = {
  ghost: 'bg-transparent',
  filled: 'bg-greenman-7',
  tonal: 'bg-greenman-0',
  outline: 'bg-white border border-border',
};

export function IconButton({
  icon,
  onPress,
  variant = 'ghost',
  size = 'md',
  haptic = true,
  disabled,
  className,
  accessibilityLabel,
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 16, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 320 });
        }}
        onPress={() => {
          if (haptic) Haptics.selectionAsync().catch(() => {});
          onPress?.();
        }}
        className={`items-center justify-center rounded-full ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-40' : ''} ${className ?? ''}`}
      >
        <View pointerEvents="none">{icon}</View>
      </Pressable>
    </Animated.View>
  );
}
