import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { StickyCTA } from '@/components/ui/StickyCTA';
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    setError(undefined);
    const normalized = toApiPhoneKz(phone);
    try {
      await mutation.mutateAsync(normalized);
      router.push({ pathname: '/auth/code', params: { phone: normalized } });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Toast.show({
        type: 'error',
        text1: 'Не удалось отправить код',
        text2: e?.response?.data?.message ?? 'Попробуйте ещё раз',
      });
    }
  };

  return (
    <Screen edges={['left', 'right']} avoidKeyboard>
      <Header title="Вход" floating />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 96, paddingBottom: 148 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="h-24 w-24 items-center justify-center rounded-full bg-greenman-0">
          <Ionicons name="leaf-outline" size={42} color={greenman[7]} />
        </View>
        <Text className="mt-8 font-display text-[28px] leading-[34px] text-ink">
          Войти в Greenman
        </Text>
        <Text className="mt-2 text-[15px] leading-[22px] text-ink/60">
          Введите номер — пришлём код в WhatsApp.
        </Text>

        <View className="mt-8">
          <Input
            label="Номер телефона"
            placeholder="+7 (___) ___-__-__"
            keyboardType="phone-pad"
            autoFocus
            value={phone}
            onChangeText={(value) => {
              setPhone(formatKzPhoneInput(value));
              if (error) setError(undefined);
            }}
            error={error}
            hint="Используем для входа и связи по заказу."
            maxLength={20}
            leftIcon={<Ionicons name="call-outline" size={18} color={greenman[7]} />}
          />
        </View>
      </ScrollView>

      <StickyCTA
        topSlot={
          <Text className="text-center text-[11px] leading-[14px] text-ink/40">
            Продолжая, вы соглашаетесь с условиями использования.
          </Text>
        }
      >
        <Button
          label="Получить код"
          size="lg"
          full
          loading={mutation.isPending}
          disabled={!isValidKzPhone(phone)}
          onPress={submit}
        />
      </StickyCTA>
    </Screen>
  );
}
