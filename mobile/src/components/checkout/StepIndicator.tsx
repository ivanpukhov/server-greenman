import { View } from 'react-native';
import { greenman, ink } from '@/theme/colors';

type Props = {
  step: number;
  total?: number;
};

export function StepIndicator({ step, total = 3 }: Props) {
  const progress = Math.max(0, Math.min(step, total)) / total;

  return (
    <View className="h-1 w-full overflow-hidden bg-ink/10">
      <View
        style={{
          width: `${progress * 100}%`,
          height: 4,
          backgroundColor: greenman[7],
          borderRadius: 999,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          borderBottomColor: ink[20],
          borderBottomWidth: 0,
        }}
      />
    </View>
  );
}
