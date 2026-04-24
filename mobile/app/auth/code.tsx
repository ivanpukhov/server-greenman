import { useEffect, useRef, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { cssInterop } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { useConfirmCode, useResendCode } from '@/hooks/useAuthMutations';
import { greenman } from '@/theme/colors';

cssInterop(TextInput, { className: 'style' });

const RESEND_SECONDS = 45;
const CODE_LENGTH = 6;

function prettifyPhone(p: string | undefined): string {
  if (!p) return '';
  const m = p.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+7 (${m[1]}) ${m[2]}-${m[3]}-${m[4]}` : `+7${p}`;
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
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [error]);

  const submit = async () => {
    if (code.length !== CODE_LENGTH) {
      setError('Введите все 6 цифр');
      return;
    }
    if (!phone) return;
    try {
      const data = await confirm.mutateAsync({ phoneNumber: phone, code });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (data.requiresProfile || !data.user?.firstName || !data.user?.lastName) {
        router.replace('/auth/profile');
        return;
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (e: any) {
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
    <Screen>
      <Header title="Подтверждение" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-greenman-0">
            <Ionicons name="chatbubble-ellipses-outline" size={26} color={greenman[7]} />
          </View>
          <Text className="mt-4 text-2xl font-display text-ink">Введите код</Text>
          <Text className="mt-2 text-sm text-ink-dim">
            Код отправлен на номер{' '}
            <Text className="font-semibold text-ink">{prettifyPhone(phone)}</Text>
          </Text>

          <Pressable onPress={() => inputRef.current?.focus()} className="mt-6">
            <View className="flex-row justify-between">
              {Array.from({ length: CODE_LENGTH }).map((_, idx) => {
                const filled = !!digits[idx];
                const active = focused && idx === digits.length;
                return (
                  <View
                    key={idx}
                    className={`h-14 w-12 items-center justify-center rounded-xl border ${
                      error
                        ? 'border-red-500 bg-red-50'
                        : active
                        ? 'border-greenman-7 bg-white'
                        : filled
                        ? 'border-greenman-6 bg-greenman-0'
                        : 'border-border bg-white'
                    }`}
                  >
                    <Text className="text-2xl font-display text-ink">{digits[idx] ?? ''}</Text>
                  </View>
                );
              })}
            </View>
            {error ? <Text className="mt-2 text-xs text-red-500">{error}</Text> : null}
          </Pressable>

          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D+/g, '').slice(0, CODE_LENGTH));
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
            style={{
              position: 'absolute',
              opacity: 0,
              height: 1,
              width: 1,
            }}
          />

          <View className="mt-6">
            <Button
              label="Подтвердить"
              size="lg"
              loading={confirm.isPending}
              disabled={code.length !== CODE_LENGTH}
              onPress={submit}
            />
          </View>

          <View className="mt-4 flex-row items-center justify-center gap-4">
            <Pressable
              disabled={secondsLeft > 0 || resend.isPending}
              onPress={onResend}
            >
              <Text
                className={`text-sm font-semibold ${secondsLeft > 0 ? 'text-ink-dim' : 'text-greenman-7'}`}
              >
                {secondsLeft > 0
                  ? `Отправить снова через ${secondsLeft} с`
                  : 'Отправить снова'}
              </Text>
            </Pressable>
            <Text className="text-ink-dim">·</Text>
            <Pressable onPress={() => router.back()}>
              <Text className="text-sm text-ink-dim">Сменить номер</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
