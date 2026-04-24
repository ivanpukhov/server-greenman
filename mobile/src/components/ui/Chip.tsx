import { View } from 'react-native';
import { ReactNode } from 'react';
import { Text } from './Text';
import { AnimatedPressable } from './AnimatedPressable';

type Tone = 'neutral' | 'primary' | 'ink' | 'sun' | 'clay' | 'danger' | 'inverse';
type Size = 'xs' | 'sm' | 'md';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  size?: Size;
  tone?: Tone;
  className?: string;
  disabled?: boolean;
};

const sizes: Record<Size, string> = {
  xs: 'h-7 px-3',
  sm: 'h-9 px-4',
  md: 'h-11 px-5',
};

const labelSizes: Record<Size, string> = {
  xs: 'text-[11px]',
  sm: 'text-[12px]',
  md: 'text-[13px]',
};

function toneOff(tone: Tone): { bg: string; text: string; border: string } {
  switch (tone) {
    case 'primary':
      return { bg: 'bg-greenman-0', text: 'text-greenman-8', border: 'border-transparent' };
    case 'ink':
      return { bg: 'bg-sand-1', text: 'text-ink', border: 'border-transparent' };
    case 'sun':
      return { bg: 'bg-sun-0', text: 'text-sun-3', border: 'border-transparent' };
    case 'clay':
      return { bg: 'bg-clay-0', text: 'text-clay-5', border: 'border-transparent' };
    case 'danger':
      return { bg: 'bg-red-50', text: 'text-danger', border: 'border-transparent' };
    case 'inverse':
      return { bg: 'bg-white/10', text: 'text-white', border: 'border-white/15' };
    default:
      return { bg: 'bg-sand-1', text: 'text-ink', border: 'border-transparent' };
  }
}

function toneOn(tone: Tone): { bg: string; text: string; border: string } {
  switch (tone) {
    case 'primary':
      return { bg: 'bg-greenman-8', text: 'text-white', border: 'border-transparent' };
    case 'ink':
      return { bg: 'bg-ink', text: 'text-white', border: 'border-transparent' };
    case 'sun':
      return { bg: 'bg-sun-2', text: 'text-ink', border: 'border-transparent' };
    case 'clay':
      return { bg: 'bg-clay-5', text: 'text-white', border: 'border-transparent' };
    case 'danger':
      return { bg: 'bg-danger', text: 'text-white', border: 'border-transparent' };
    case 'inverse':
      return { bg: 'bg-white', text: 'text-ink', border: 'border-transparent' };
    default:
      return { bg: 'bg-ink', text: 'text-white', border: 'border-transparent' };
  }
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  rightIcon,
  size = 'sm',
  tone = 'neutral',
  className,
  disabled,
}: Props) {
  const state = selected ? toneOn(tone) : toneOff(tone);
  const base = `flex-row items-center justify-center rounded-pill border ${sizes[size]} ${state.bg} ${state.border} ${disabled ? 'opacity-50' : ''}`;
  const content = (
    <View className={base}>
      {icon ? <View className="mr-1.5">{icon}</View> : null}
      <Text className={`font-bold ${labelSizes[size]} ${state.text}`} tracking="tight">
        {label}
      </Text>
      {rightIcon ? <View className="ml-1.5">{rightIcon}</View> : null}
    </View>
  );

  if (!onPress) return <View className={className}>{content}</View>;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      scale={0.94}
      wrapperClassName={className}
    >
      {content}
    </AnimatedPressable>
  );
}
