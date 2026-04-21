import { View } from 'react-native';
import { Text } from './Text';

type Variant = 'count' | 'hot' | 'new' | 'neutral';

type Props = {
  count?: number;
  label?: string;
  variant?: Variant;
  pulseKey?: string | number;
  className?: string;
};

const variants: Record<Variant, string> = {
  count: 'bg-greenman-6',
  hot: 'bg-red-500',
  new: 'bg-amber-500',
  neutral: 'bg-ink',
};

export function Badge({ count, label, variant = 'count', className }: Props) {
  const text = count !== undefined ? (count > 99 ? '99+' : `${count}`) : label ?? '';
  if (count !== undefined && count <= 0) return null;

  return (
    <View
      className={`min-w-5 h-5 items-center justify-center rounded-full px-1.5 ${variants[variant]} ${className ?? ''}`}
    >
      <Text className="text-[10px] font-bold text-white">{text}</Text>
    </View>
  );
}
