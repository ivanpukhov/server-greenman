import { View, ViewProps, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { cssInterop } from 'nativewind';
import { AnimatedPressable } from './AnimatedPressable';
import { shadows } from '@/theme/shadows';
import { gradients } from '@/theme/colors';

cssInterop(View, { className: 'style' });
cssInterop(LinearGradient, { className: 'style' });

type Variant =
  | 'flat'
  | 'raised'
  | 'elevated'
  | 'outline'
  | 'tonal'
  | 'sand'
  | 'cream'
  | 'inverse'
  | 'gradient'
  | 'gradient-clay'
  | 'gradient-sunrise'
  | 'gradient-plum';

type Radius = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

type Props = Omit<ViewProps, 'style'> & {
  variant?: Variant;
  padded?: boolean | 'sm' | 'md' | 'lg' | 'xl';
  pressable?: boolean;
  onPress?: () => void;
  haptic?: boolean;
  radius?: Radius;
  className?: string;
  innerClassName?: string;
  style?: ViewStyle | ViewStyle[];
  children: ReactNode;
};

const radiusClass: Record<Radius, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

const padClass = (p: Props['padded']) => {
  if (!p) return '';
  if (p === true || p === 'md') return 'p-5';
  if (p === 'sm') return 'p-4';
  if (p === 'lg') return 'p-6';
  if (p === 'xl') return 'p-7';
  return '';
};

function variantClass(v: Variant): string {
  switch (v) {
    case 'flat':
      return 'bg-surface';
    case 'raised':
      return 'bg-surface';
    case 'elevated':
      return 'bg-surface';
    case 'outline':
      return 'bg-surface border border-border';
    case 'tonal':
      return 'bg-greenman-0';
    case 'sand':
      return 'bg-sand-1';
    case 'cream':
      return 'bg-surface-cream border border-border';
    case 'inverse':
      return 'bg-ink';
    default:
      return '';
  }
}

function variantShadow(v: Variant): ViewStyle | undefined {
  if (v === 'raised') return shadows.soft;
  if (v === 'elevated') return shadows.card;
  if (v === 'inverse') return shadows.float;
  if (v === 'gradient') return shadows.glow;
  if (v === 'gradient-clay') return shadows.glowClay;
  if (v === 'gradient-sunrise' || v === 'gradient-plum') return shadows.float;
  return undefined;
}

function Gradient({
  variant,
  children,
  className,
}: {
  variant: Extract<Variant, 'gradient' | 'gradient-clay' | 'gradient-sunrise' | 'gradient-plum'>;
  children: ReactNode;
  className?: string;
}) {
  const colors =
    variant === 'gradient'
      ? gradients.cta
      : variant === 'gradient-clay'
      ? gradients.clay
      : variant === 'gradient-sunrise'
      ? gradients.sunrise
      : gradients.plum;
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={className}
    >
      {children}
    </LinearGradient>
  );
}

export function Card({
  variant = 'flat',
  padded = true,
  pressable,
  onPress,
  haptic = true,
  radius = 'lg',
  className,
  innerClassName,
  style,
  children,
  ...rest
}: Props) {
  const isGradient = variant.startsWith('gradient');
  const shadowStyle = variantShadow(variant);
  const shellClass = `overflow-hidden ${radiusClass[radius]} ${!isGradient ? variantClass(variant) : ''} ${className ?? ''}`;
  const inner = `${padClass(padded)} ${innerClassName ?? ''}`;

  const body = isGradient ? (
    <Gradient variant={variant as any} className={inner}>
      {children}
    </Gradient>
  ) : (
    <View className={inner}>{children}</View>
  );

  if (pressable) {
    return (
      <AnimatedPressable
        onPress={onPress}
        haptic={haptic ? 'selection' : 'none'}
        scale={0.98}
        className={shellClass}
        wrapperStyle={[shadowStyle as any, ...(Array.isArray(style) ? style : style ? [style] : [])]}
      >
        {body}
      </AnimatedPressable>
    );
  }

  return (
    <View className={shellClass} style={[shadowStyle as any, ...(Array.isArray(style) ? style : style ? [style] : [])]} {...rest}>
      {body}
    </View>
  );
}
