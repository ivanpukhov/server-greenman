import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import { Text } from './Text';

type Size = 'sm' | 'md';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  size?: Size;
  className?: string;
  disabled?: boolean;
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3',
  md: 'h-10 px-4',
};

const labelSizes: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-sm',
};

export function Chip({
  label,
  selected,
  onPress,
  icon,
  rightIcon,
  size = 'md',
  className,
  disabled,
}: Props) {
  const base = 'flex-row items-center justify-center rounded-full';
  const state = selected
    ? 'bg-greenman-7 border border-greenman-7'
    : 'bg-greenman-0 border border-greenman-1';
  const labelColor = selected ? 'text-white' : 'text-greenman-8';
  const pressClass = onPress && !disabled ? 'active:opacity-80' : '';
  const opacity = disabled ? 'opacity-50' : '';

  const content = (
    <View className={`${base} ${sizes[size]} ${state} ${pressClass} ${opacity} ${className ?? ''}`}>
      {icon ? <View className="mr-1.5">{icon}</View> : null}
      <Text className={`font-semibold ${labelSizes[size]} ${labelColor}`}>{label}</Text>
      {rightIcon ? <View className="ml-1.5">{rightIcon}</View> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
    >
      {content}
    </Pressable>
  );
}
