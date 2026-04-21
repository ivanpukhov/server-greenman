import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { useAdminRequestCode } from '@/hooks/admin/useAdminAuth';
import { greenman } from '@/theme/colors';

const IIN_LENGTH = 12;

export default function AdminLoginScreen() {
  const router = useRouter();
  const [iin, setIin] = useState('');
  const [error, setError] = useState<string | undefined>();
  const mutation = useAdminRequestCode();

  const submit = async () => {
    if (iin.length !== IIN_LENGTH) {
      setError('ИИН должен содержать 12 цифр');
      return;
    }
    setError(undefined);
    try {
      const data = await mutation.mutateAsync(iin);
      router.push({ pathname: '/admin/code', params: { iin, phoneMask: data.phoneMask } });
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Не удалось отправить код';
      setError(msg);
      Toast.show({ type: 'error', text1: 'Ошибка', text2: msg });
    }
  };

  return (
    <Screen>
      <Header title="Админ-панель" onBack={() => router.replace('/(tabs)/profile')} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-greenman-0">
            <Ionicons name="shield-checkmark-outline" size={26} color={greenman[7]} />
          </View>
          <Text className="mt-4 text-2xl font-display text-ink">Вход в админку</Text>
          <Text className="mt-2 text-sm text-ink-dim">
            Введите ИИН. Код подтверждения придёт в WhatsApp на ваш админский номер.
          </Text>

          <View className="mt-6">
            <Input
              label="ИИН"
              placeholder="12 цифр"
              keyboardType="number-pad"
              autoFocus
              mask="digits"
              maxLength={IIN_LENGTH}
              value={iin}
              onChangeText={(v) => {
                setIin(v.slice(0, IIN_LENGTH));
                if (error) setError(undefined);
              }}
              error={error}
              leftIcon={<Ionicons name="card-outline" size={18} color={greenman[7]} />}
            />
          </View>

          <View className="mt-6">
            <Button
              label="Получить код"
              size="lg"
              loading={mutation.isPending}
              disabled={iin.length !== IIN_LENGTH}
              onPress={submit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
