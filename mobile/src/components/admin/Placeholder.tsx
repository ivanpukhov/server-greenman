import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Header } from '@/components/ui/Header';
import { greenman } from '@/theme/colors';

type Props = { title: string; subtitle?: string };

export function AdminPlaceholder({ title, subtitle }: Props) {
  const router = useRouter();
  return (
    <Screen>
      <Header title={title} onBack={() => router.back()} />
      <View className="flex-1 items-center justify-center px-6">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-greenman-0">
          <Ionicons name="construct-outline" size={24} color={greenman[7]} />
        </View>
        <Text className="mt-4 text-xl font-display text-ink">Скоро</Text>
        <Text className="mt-2 text-center text-sm text-ink-dim">
          {subtitle ?? 'Раздел появится в следующей итерации админки.'}
        </Text>
      </View>
    </Screen>
  );
}
