import { View } from 'react-native';
import { Text } from './Text';

type Tone = 'light' | 'dark' | 'sand' | 'accent' | 'clay';

type Props = {
  value: string | number;
  label: string;
  tone?: Tone;
  className?: string;
};

const toneClass: Record<Tone, { wrap: string; value: string; label: string }> = {
  light: { wrap: 'bg-white', value: 'text-ink', label: 'text-ink-dim' },
  dark: { wrap: 'bg-ink', value: 'text-white', label: 'text-white/60' },
  sand: { wrap: 'bg-sand-1', value: 'text-ink', label: 'text-ink-dim' },
  accent: { wrap: 'bg-greenman-0', value: 'text-greenman-9', label: 'text-greenman-8' },
  clay: { wrap: 'bg-clay-0', value: 'text-clay-6', label: 'text-clay-5' },
};

export function StatPill({ value, label, tone = 'light', className }: Props) {
  const t = toneClass[tone];
  return (
    <View className={`items-center justify-center rounded-lg ${t.wrap} px-3 py-4 ${className ?? ''}`}>
      <Text className={`font-display text-[24px] leading-[26px] ${t.value}`} tracking="tight">
        {value}
      </Text>
      <Text
        className={`mt-1 text-[11px] font-semibold uppercase ${t.label}`}
        tracking="wide"
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
