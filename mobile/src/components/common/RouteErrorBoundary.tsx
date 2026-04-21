import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

type Props = {
  error: Error;
  retry: () => void;
};

export function ErrorBoundary({ error, retry }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <View className="h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <Ionicons name="warning-outline" size={32} color="#dc2626" />
        </View>
        <Text className="mt-4 text-center text-xl font-display text-ink">
          Что-то пошло не так
        </Text>
        <Text className="mt-2 text-center text-sm text-ink-dim">
          Произошла непредвиденная ошибка. Мы уже разбираемся.
        </Text>
        {__DEV__ ? (
          <View className="mt-4 w-full rounded-xl border border-border bg-greenman-0 p-3">
            <Text className="text-xs font-mono text-ink-dim" selectable>
              {error?.message ?? String(error)}
            </Text>
          </View>
        ) : null}
        <View className="mt-6 w-full max-w-xs">
          <Button label="Попробовать снова" onPress={retry} size="lg" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
