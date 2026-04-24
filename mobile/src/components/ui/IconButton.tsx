import { View } from 'react-native';
import { ReactNode } from 'react';
import { AnimatedPressable } from './AnimatedPressable';
import { shadows } from '@/theme/shadows';

type Tone =
  | 'ghost'
  | 'filled'
  | 'tonal'
  | 'sand'
  | 'outline'
  | 'inverse'
  | 'glass'
  | 'ink';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  icon: ReactNode;
  onPress?: () => void;
  tone?: Tone;
  /** @deprecated use `tone` */
  variant?: Tone;
  size?: Size;
  haptic?: boolean;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
  elevated?: boolean;
};

const sizes: Record<Size, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
};

const tones: Record<Tone, string> = {
  ghost: 'bg-transparent',
  filled: 'bg-greenman-8',
  tonal: 'bg-greenman-0',
  sand: 'bg-sand-1',
  outline: 'bg-transparent border border-sand-3',
  inverse: 'bg-white',
  glass: 'bg-white/15 border border-white/20',
  ink: 'bg-ink',
};

export function IconButton({
  icon,
  onPress,
  tone,
  variant,
  size = 'md',
  haptic = true,
  disabled,
  className,
  accessibilityLabel,
  elevated,
}: Props) {
  const t = tone ?? variant ?? 'sand';
  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      haptic={haptic ? 'selection' : 'none'}
      scale={0.9}
      onPress={onPress}
      wrapperStyle={elevated ? shadows.float : undefined}
      wrapperClassName={className}
      className={`items-center justify-center rounded-pill ${sizes[size]} ${tones[t]} ${disabled ? 'opacity-40' : ''}`}
    >
      <View pointerEvents="none">{icon}</View>
    </AnimatedPressable>
  );
}
