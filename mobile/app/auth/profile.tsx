import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { useUpdateProfile } from '@/hooks/useProfile';
import { greenman } from '@/theme/colors';

function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export default function AuthProfileScreen() {
  const storedFirstName = useAuthStore((s) => s.firstName);
  const storedLastName = useAuthStore((s) => s.lastName);
  const [firstName, setFirstName] = useState(storedFirstName ?? '');
  const [lastName, setLastName] = useState(storedLastName ?? '');
  const [touched, setTouched] = useState(false);
  const update = useUpdateProfile();

  const first = cleanName(firstName);
  const last = cleanName(lastName);
  const firstError = touched && !first ? 'Введите имя' : undefined;
  const lastError = touched && !last ? 'Введите фамилию' : undefined;

  const save = async () => {
    setTouched(true);
    if (!first || !last) return;
    try {
      await update.mutateAsync({ firstName: first, lastName: last });
      router.replace('/');
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Не удалось сохранить',
        text2: e?.response?.data?.detail ?? e?.response?.data?.message ?? e?.message ?? 'Попробуйте ещё раз',
      });
    }
  };

  return (
    <Screen avoidKeyboard>
      <Header title="Профиль" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-greenman-0">
            <Ionicons name="person-outline" size={26} color={greenman[7]} />
          </View>
          <Text className="mt-4 text-2xl font-display text-ink">Как вас зовут?</Text>
          <Text className="mt-2 text-sm leading-5 text-ink-dim">
            Имя и фамилия нужны для профиля, заказов и обращений в поддержку.
          </Text>

          <View className="mt-6 gap-4">
            <Input
              label="Имя"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Например, Алия"
              autoCapitalize="words"
              autoFocus
              error={firstError}
              leftIcon={<Ionicons name="person-outline" size={18} color={greenman[7]} />}
            />
            <Input
              label="Фамилия"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Например, Садыкова"
              autoCapitalize="words"
              error={lastError}
              leftIcon={<Ionicons name="id-card-outline" size={18} color={greenman[7]} />}
            />
          </View>

          <View className="mt-7">
            <Button
              label="Сохранить"
              size="lg"
              full
              loading={update.isPending}
              onPress={save}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
