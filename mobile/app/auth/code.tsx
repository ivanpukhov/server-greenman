import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { cssInterop } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { StickyCTA } from '@/components/ui/StickyCTA';
import { useConfirmCode, useResendCode } from '@/hooks/useAuthMutations';
import { greenman } from '@/theme/colors';

cssInterop(TextInput, { className: 'style' });

const RESEND_SECONDS = 45;
const CODE_LENGTH = 6;

function prettifyPhone(phone: string | undefined): string {
  if (!phone) return '';
  const match = phone.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return match ? `+7 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}` : `+7${phone}`;
}

export default function CodeAuthScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [focused, setFocused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const confirm = useConfirmCode();
  const resend = useResendCode();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (code.length === CODE_LENGTH) submit();
  }, [code]);

  const submit = async () => {
    if (code.length !== CODE_LENGTH) {
      setError('Введите все 6 цифр');
      return;
    }
    if (!phone || confirm.isPending) return;
    try {
      const data = await confirm.mutateAsync({ phoneNumber: phone, code });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (data.requiresProfile || !data.user?.firstName || !data.user?.lastName) {
        router.replace('/auth/profile');
        return;
      }
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e?.response?.data?.message ?? 'Неверный код. Попробуйте ещё раз.');
    }
  };

  const onResend = async () => {
    if (!phone || secondsLeft > 0) return;
    try {
      await resend.mutateAsync(phone);
      setSecondsLeft(RESEND_SECONDS);
      setCode('');
      setError(undefined);
      Toast.show({ type: 'success', text1: 'Код отправлен' });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Не удалось отправить код',
        text2: e?.response?.data?.message,
      });
    }
  };

  const digits = code.split('');

  return (
    <Screen edges={['left', 'right']} avoidKeyboard>
      <Header title="Код" floating />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 96, paddingBottom: 148 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="h-24 w-24 items-center justify-center rounded-full bg-greenman-0">
          <Ionicons name="chatbubble-ellipses-outline" size={42} color={greenman[7]} />
        </View>
        <Text className="mt-8 font-display text-[28px] leading-[34px] text-ink">
          Введите код
        </Text>
        <Text className="mt-2 text-[15px] leading-[22px] text-ink/60">
          Код отправлен на <Text className="font-semibold text-ink">{prettifyPhone(phone)}</Text>
        </Text>

        <Pressable onPress={() => inputRef.current?.focus()} className="mt-8">
          <View className="flex-row justify-between">
            {Array.from({ length: CODE_LENGTH }).map((_, index) => {
              const filled = !!digits[index];
              const active = focused && index === digits.length;
              return (
                <View
                  key={index}
                  className={`h-14 w-12 items-center justify-center rounded-md border ${
                    error
                      ? 'border-danger bg-red-50'
                      : active
                      ? 'border-greenman-7 bg-white'
                      : filled
                      ? 'border-greenman-6 bg-greenman-0'
                      : 'border-ink/10 bg-white'
                  }`}
                >
                  <Text className="font-display text-[22px] leading-[28px] text-ink">
                    {digits[index] ?? ''}
                  </Text>
                </View>
              );
            })}
          </View>
          {error ? <Text className="mt-2 text-[11px] text-danger">{error}</Text> : null}
        </Pressable>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(value) => {
            setCode(value.replace(/\D+/g, '').slice(0, CODE_LENGTH));
            if (error) setError(undefined);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          autoFocus
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={CODE_LENGTH}
          caretHidden
          style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
        />

        <View className="mt-6 flex-row items-center justify-center gap-4">
          <Pressable disabled={secondsLeft > 0 || resend.isPending} onPress={onResend}>
            <Text className={`text-[13px] font-semibold ${secondsLeft > 0 ? 'text-ink/60' : 'text-greenman-7'}`}>
              {secondsLeft > 0 ? `Отправить снова через ${secondsLeft} с` : 'Отправить снова'}
            </Text>
          </Pressable>
          <Text className="text-ink/40">·</Text>
          <Pressable onPress={() => router.back()}>
            <Text className="text-[13px] text-ink/60">Изменить</Text>
          </Pressable>
        </View>
      </ScrollView>

      <StickyCTA>
        <Button
          label="Подтвердить"
          size="lg"
          full
          loading={confirm.isPending}
          disabled={code.length !== CODE_LENGTH}
          onPress={submit}
        />
      </StickyCTA>
    </Screen>
  );
}
