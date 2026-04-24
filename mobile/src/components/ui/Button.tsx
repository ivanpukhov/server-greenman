import { ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Text } from './Text';
import { AnimatedPressable } from './AnimatedPressable';
import { greenman, clay, sand } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

type Variant = 'primary' | 'secondary' | 'ghost' | 'tonal' | 'inverse' | 'clay';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label?: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  full?: boolean;
  className?: string;
  accessibilityLabel?: string;
};

const heights: Record<Size, string> = {
  sm: 'h-11 px-5',
  md: 'h-[52px] px-6',
  lg: 'h-[60px] px-7',
};

const labelSize: Record<Size, string> = {
  sm: 'text-[14px]',
  md: 'text-[15px]',
  lg: 'text-[16px]',
};

const radius: Record<Size, string> = {
  sm: 'rounded-pill',
  md: 'rounded-pill',
  lg: 'rounded-pill',
};

function PrimaryContent({ children }: { children: ReactNode }) {
  return (
    <LinearGradient
      colors={[greenman[5], greenman[7], greenman[9]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </LinearGradient>
  );
}

function ClayContent({ children }: { children: ReactNode }) {
  return (
    <LinearGradient
      colors={[clay[3], clay[5]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </LinearGradient>
  );
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  onPress,
  iconLeft,
  iconRight,
  full,
  className,
  accessibilityLabel,
}: Props) {
  const isDisabled = disabled || loading;

  const baseShape = `${heights[size]} ${radius[size]} flex-row items-center justify-center overflow-hidden`;
  const layout = full ? 'self-stretch' : 'self-start';

  let shell = '';
  let labelCls = '';
  let indicatorColor = '#fff';
  let shadowStyle = undefined as undefined | object;

  switch (variant) {
    case 'primary':
      shell = 'bg-greenman-8';
      labelCls = 'text-white';
      shadowStyle = shadows.glow;
      break;
    case 'clay':
      shell = 'bg-clay-5';
      labelCls = 'text-white';
      shadowStyle = shadows.glowClay;
      break;
    case 'secondary':
      shell = 'bg-transparent border border-sand-3';
      labelCls = 'text-ink';
      indicatorColor = greenman[7];
      break;
    case 'tonal':
      shell = 'bg-greenman-0';
      labelCls = 'text-greenman-8';
      indicatorColor = greenman[8];
      break;
    case 'ghost':
      shell = 'bg-transparent';
      labelCls = 'text-ink';
      indicatorColor = greenman[7];
      break;
    case 'inverse':
      shell = 'bg-white';
      labelCls = 'text-ink';
      indicatorColor = greenman[8];
      shadowStyle = shadows.float;
      break;
  }

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <View className="flex-row items-center justify-center">
          {iconLeft ? <View className="mr-2">{iconLeft}</View> : null}
          {label ? (
            <Text
              className={`${labelSize[size]} font-bold ${labelCls}`}
              tracking="tight"
            >
              {label}
            </Text>
          ) : null}
          {iconRight ? <View className="ml-2">{iconRight}</View> : null}
        </View>
      )}
    </>
  );

  const inner =
    variant === 'primary' ? (
      <PrimaryContent>{content}</PrimaryContent>
    ) : variant === 'clay' ? (
      <ClayContent>{content}</ClayContent>
    ) : (
      content
    );

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      haptic={variant === 'primary' || variant === 'clay' ? 'medium' : 'light'}
      disabled={isDisabled}
      onPress={onPress}
      scale={0.955}
      wrapperClassName={`${layout} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      wrapperStyle={shadowStyle}
      className={`${baseShape} ${shell}`}
    >
      {inner}
    </AnimatedPressable>
  );
}
