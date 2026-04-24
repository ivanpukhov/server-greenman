import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { cssInterop } from 'nativewind';
import { gradients } from '@/theme/colors';

cssInterop(LinearGradient, { className: 'style' });

type Props = {
  size?: number;
  seen?: boolean;
  thickness?: number;
  style?: ViewStyle;
  children: ReactNode;
};

export function StoryRing({ size = 68, seen = false, thickness = 2.5, style, children }: Props) {
  const innerSize = size - thickness * 2;
  if (seen) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: thickness,
            borderColor: '#c8bfae',
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <View
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            overflow: 'hidden',
            backgroundColor: '#fff',
          }}
        >
          {children}
        </View>
      </View>
    );
  }
  return (
    <LinearGradient
      colors={gradients.story as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          padding: thickness,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          overflow: 'hidden',
          backgroundColor: '#fff',
          borderWidth: 2,
          borderColor: '#fff',
        }}
      >
        {children}
      </View>
    </LinearGradient>
  );
}
