import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Страница не найдена' }} />
      <Screen>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-bold text-ink">Страница не найдена</Text>
          <Link href="/" className="mt-6">
            <Text className="text-greenman-7 font-semibold">На главную</Text>
          </Link>
        </View>
      </Screen>
    </>
  );
}
