import { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { cssInterop } from 'nativewind';

cssInterop(View, { className: 'style' });

type Props = ViewProps & {
  className?: string;
};

export function Skeleton({ className, style, ...rest }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.45, 0.9]),
  }));

  return (
    <Animated.View
      {...rest}
      style={[{ backgroundColor: '#eef1ee' }, animatedStyle, style]}
      className={`rounded-md ${className ?? ''}`}
    />
  );
}
