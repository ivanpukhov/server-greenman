import { forwardRef, ReactNode } from 'react';
import { Pressable, PressableProps, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { cssInterop } from 'nativewind';

cssInterop(Animated.View, { className: 'style' });
cssInterop(View, { className: 'style' });

type HapticKind = 'none' | 'selection' | 'light' | 'medium' | 'success';

type Props = Omit<PressableProps, 'style'> & {
  className?: string;
  wrapperClassName?: string;
  wrapperStyle?: ViewStyle | ViewStyle[];
  scale?: number;
  opacityTo?: number;
  haptic?: HapticKind;
  children: ReactNode;
};

const SPRING = { damping: 16, stiffness: 300, mass: 0.6 };

function fireHaptic(kind: HapticKind) {
  if (kind === 'none') return;
  if (kind === 'selection') Haptics.selectionAsync().catch(() => {});
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  if (kind === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  if (kind === 'success')
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export const AnimatedPressable = forwardRef<View, Props>(function AnimatedPressable(
  {
    scale: targetScale = 0.965,
    opacityTo = 0.85,
    haptic = 'selection',
    className,
    wrapperClassName,
    wrapperStyle,
    onPressIn,
    onPressOut,
    onPress,
    children,
    ...rest
  },
  ref,
) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[wrapperStyle, animatedStyle]} className={wrapperClassName}>
      <Pressable
        ref={ref}
        {...rest}
        className={className}
        onPressIn={(e) => {
          scale.value = withSpring(targetScale, SPRING);
          opacity.value = withTiming(opacityTo, { duration: 80 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, SPRING);
          opacity.value = withTiming(1, { duration: 120 });
          onPressOut?.(e);
        }}
        onPress={(e) => {
          fireHaptic(haptic);
          onPress?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
});
