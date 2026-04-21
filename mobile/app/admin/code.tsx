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
import { cssInterop } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { useAdminConfirmCode } from '@/hooks/admin/useAdminAuth';
import { greenman } from '@/theme/colors';

cssInterop(TextInput, { className: 'style' });

const CODE_LENGTH = 6;

export default function AdminCodeScreen() {
  const router = useRouter();
  const { iin, phoneMask } = useLocalSearchParams<{ iin: string; phoneMask?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [focused, setFocused] = useState(false);
  const confirm = useAdminConfirmCode();
  const inputRef = useRef<TextInput>(null);

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
    if (!iin) return;
    try {
      await confirm.mutateAsync({ iin, code });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/admin');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Неверный или просроченный код');
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
            Отправили код на{' '}
            <Text className="font-semibold text-ink">{phoneMask ?? 'ваш номер'}</Text>
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
            style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
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

          <View className="mt-4 items-center">
            <Pressable onPress={() => router.back()}>
              <Text className="text-sm text-ink-dim">Другой ИИН</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
