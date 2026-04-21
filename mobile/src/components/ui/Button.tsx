import { Pressable, ActivityIndicator, PressableProps } from 'react-native';
import { Text } from './Text';
import * as Haptics from 'expo-haptics';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

const base = 'items-center justify-center rounded-xl active:opacity-80';
const sizes: Record<Size, string> = {
  md: 'h-12 px-5',
  lg: 'h-14 px-6',
};
const variants: Record<Variant, string> = {
  primary: 'bg-greenman-6',
  secondary: 'bg-greenman-0 border border-greenman-2',
  ghost: 'bg-transparent',
};
const labelVariants: Record<Variant, string> = {
  primary: 'text-white font-bold',
  secondary: 'text-greenman-8 font-semibold',
  ghost: 'text-greenman-7 font-semibold',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  onPress,
  className,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#0e9a47'} />
      ) : (
        <Text className={`text-base ${labelVariants[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
