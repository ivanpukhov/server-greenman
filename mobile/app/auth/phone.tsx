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
import { formatKzPhoneInput, isValidKzPhone, toApiPhoneKz } from '@/lib/format/phone';
import { useRegisterLogin } from '@/hooks/useAuthMutations';
import { greenman } from '@/theme/colors';

export default function PhoneAuthScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | undefined>();
  const mutation = useRegisterLogin();

  const submit = async () => {
    if (!isValidKzPhone(phone)) {
      setError('Введите корректный номер');
      return;
    }
    setError(undefined);
    const normalized = toApiPhoneKz(phone);
    try {
      await mutation.mutateAsync(normalized);
      router.push({ pathname: '/auth/code', params: { phone: normalized } });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Не удалось отправить код',
        text2: e?.response?.data?.message ?? 'Попробуйте ещё раз',
      });
    }
  };

  return (
    <Screen>
      <Header title="Вход" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-greenman-0">
            <Ionicons name="logo-whatsapp" size={26} color={greenman[7]} />
          </View>
          <Text className="mt-4 text-2xl font-display text-ink">Вход в аккаунт</Text>
          <Text className="mt-2 text-sm text-ink-dim">
            Введите номер телефона — отправим код подтверждения в WhatsApp
          </Text>

          <View className="mt-6">
            <Input
              label="Номер телефона"
              placeholder="+7 (___) ___-__-__"
              keyboardType="phone-pad"
              autoFocus
              value={phone}
              onChangeText={(v) => {
                setPhone(formatKzPhoneInput(v));
                if (error) setError(undefined);
              }}
              error={error}
              maxLength={20}
              leftIcon={<Ionicons name="call-outline" size={18} color={greenman[7]} />}
            />
          </View>

          <View className="mt-6">
            <Button
              label="Получить код"
              size="lg"
              loading={mutation.isPending}
              disabled={!isValidKzPhone(phone)}
              onPress={submit}
            />
          </View>

          <Text className="mt-4 text-center text-xs leading-4 text-ink-dim">
            Нажимая «Получить код», вы соглашаетесь с условиями использования и политикой конфиденциальности.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
