import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StickyCTA } from '@/components/ui/StickyCTA';
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
    <Screen edges={['left', 'right']} avoidKeyboard>
      <Header title="Профиль" floating />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 96, paddingBottom: 148 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="h-24 w-24 items-center justify-center rounded-full bg-greenman-0">
          <Ionicons name="person-outline" size={42} color={greenman[7]} />
        </View>
        <Text className="mt-8 font-display text-[28px] leading-[34px] text-ink">
          Расскажите о себе
        </Text>
        <Text className="mt-2 text-[15px] leading-[22px] text-ink/60">
          Имя и фамилия нужны для заказов и обращений в поддержку.
        </Text>

        <View className="mt-8 gap-4">
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
      </ScrollView>

      <StickyCTA>
        <Button
          label="Продолжить"
          size="lg"
          full
          loading={update.isPending}
          disabled={!first || !last}
          onPress={save}
        />
      </StickyCTA>
    </Screen>
  );
}
