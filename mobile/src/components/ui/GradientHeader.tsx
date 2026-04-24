import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
import { ReactNode } from 'react';
import { gradients } from '@/theme/colors';

cssInterop(LinearGradient, { className: 'style' });

type Palette = 'forest' | 'warm' | 'sunrise' | 'plum' | 'ink';

type Props = {
  palette?: Palette;
  safeTop?: boolean;
  height?: number;
  rounded?: boolean;
  style?: ViewStyle;
  className?: string;
  children: ReactNode;
};

function paletteColors(p: Palette): readonly string[] {
  switch (p) {
    case 'forest':
      return gradients.hero;
    case 'warm':
      return gradients.heroWarm;
    case 'sunrise':
      return gradients.sunrise;
    case 'plum':
      return gradients.plum;
    case 'ink':
      return ['#05210f', '#0b1a11'] as const;
  }
}

export function GradientHeader({
  palette = 'forest',
  safeTop = true,
  height,
  rounded = true,
  style,
  className,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={paletteColors(palette) as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          paddingTop: safeTop ? insets.top + 8 : 0,
          minHeight: height,
          borderBottomLeftRadius: rounded ? 36 : 0,
          borderBottomRightRadius: rounded ? 36 : 0,
          overflow: 'hidden',
        },
        style,
      ]}
      className={className}
    >
      <View className="flex-1">{children}</View>
    </LinearGradient>
  );
}
