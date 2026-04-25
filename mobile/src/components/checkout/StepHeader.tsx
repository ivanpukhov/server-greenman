import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { StepIndicator } from './StepIndicator';
import { ink } from '@/theme/colors';

type Props = {
  step: number;
  total?: number;
  title: string;
  onBack?: () => void;
};

export function StepHeader({ step, total = 3, title, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="border-b border-border bg-white" style={{ paddingTop: insets.top }}>
      <View className="h-16 flex-row items-center px-3">
        <AnimatedPressable
          onPress={onBack ?? (() => router.back())}
          haptic="selection"
          className="h-10 w-10 items-center justify-center rounded-full bg-sand-1"
          accessibilityRole="button"
          accessibilityLabel="Назад"
        >
          <Ionicons name="chevron-back" size={22} color={ink.DEFAULT} />
        </AnimatedPressable>

        <View className="flex-1 items-center px-2">
          <Text variant="meta-upper" className="text-ink/50" tracking="wide">
            Шаг {step}/{total}
          </Text>
          <Text className="mt-0.5 text-[17px] font-semibold text-ink" numberOfLines={1}>
            {title}
          </Text>
        </View>

        <AnimatedPressable
          onPress={() => router.back()}
          haptic="selection"
          className="h-10 w-10 items-center justify-center rounded-full bg-sand-1"
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
        >
          <Ionicons name="close" size={21} color={ink.DEFAULT} />
        </AnimatedPressable>
      </View>
      <StepIndicator step={step} total={total} />
    </View>
  );
}
