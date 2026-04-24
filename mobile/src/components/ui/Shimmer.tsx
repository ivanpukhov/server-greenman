import { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';

cssInterop(Animated.View, { className: 'style' });

type Props = {
  className?: string;
  style?: ViewStyle;
};

export function Shimmer({ className, style }: Props) {
  const x = useSharedValue(-1);

  useEffect(() => {
    x.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.linear }),
      -1,
      false,
    );
  }, [x]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * 280 }],
  }));

  return (
    <View
      className={`overflow-hidden bg-sand-1 ${className ?? ''}`}
      style={[{ borderRadius: 12 }, style]}
    >
      <Animated.View
        style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 280 }, animatedStyle]}
      >
        <LinearGradient
          colors={['rgba(243,238,230,0)', 'rgba(255,255,255,0.9)', 'rgba(243,238,230,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
