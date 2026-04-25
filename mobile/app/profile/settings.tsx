import { useState } from 'react';
import { Alert, Linking, ScrollView, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { useCountryStore } from '@/stores/country.store';
import { useDeleteAccount } from '@/hooks/useProfile';
import { getLocale, setLocale, type AppLocale } from '@/i18n';
import { CountryMark, CurrencyMark } from '@/components/ui/CountryMark';
import { greenman, ink, sand } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

const LANGUAGES: { key: AppLocale; label: string; sub: string }[] = [
  { key: 'ru', label: 'Русский', sub: 'Основной язык' },
  { key: 'kz', label: 'Қазақша', sub: 'Қазақстан' },
  { key: 'en', label: 'English', sub: 'International' },
];

const COUNTRIES: { key: 'KZ' | 'RF'; label: string }[] = [
  { key: 'KZ', label: 'Казахстан' },
  { key: 'RF', label: 'Россия' },
];

export default function SettingsScreen() {
  const logout = useAuthStore((s) => s.logout);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const country = useCountryStore((s) => s.country);
  const setCountry = useCountryStore((s) => s.setCountry);
  const [locale, setLocaleState] = useState<AppLocale>(getLocale());
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const deleteAccount = useDeleteAccount();

  const handleLocale = (next: AppLocale) => {
    setLocale(next);
    setLocaleState(next);
  };

  const confirmLogout = () => {
    Alert.alert('Выход', 'Выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => { logout(); router.back(); } },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Удалить аккаунт?',
      'Профиль, адреса, сохранения, лайки, репосты и комментарии будут удалены. Заказы останутся в системе без привязки к аккаунту.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync();
              router.replace('/');
            } catch (e: any) {
              Alert.alert('Не удалось удалить аккаунт', e?.response?.data?.message ?? 'Попробуйте ещё раз');
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Header title="Настройки" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 }}
      >
        <SettingSection title="Уведомления" caption="Будем уведомлять о статусе заказов и новых материалах.">
          <SettingRow
            icon="notifications-outline"
            label="Push-уведомления"
            right={<Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ true: greenman[7] }} />}
          />
          <SettingRow
            icon="mail-outline"
            label="Email-рассылка"
            right={<Switch value={emailEnabled} onValueChange={setEmailEnabled} trackColor={{ true: greenman[7] }} />}
          />
        </SettingSection>

        <SettingSection title="Регион">
          {COUNTRIES.map((item) => (
            <SettingRow
              key={item.key}
              iconNode={<CountryMark country={item.key} size="md" active={country === item.key} />}
              label={item.label}
              subtitle={<CurrencyMark country={item.key} active={country === item.key} />}
              active={country === item.key}
              onPress={() => setCountry(item.key)}
              right={country === item.key ? <Ionicons name="checkmark-circle" size={20} color={greenman[7]} /> : undefined}
            />
          ))}
        </SettingSection>

        <SettingSection title="Язык">
          {LANGUAGES.map((item) => (
            <SettingRow
              key={item.key}
              icon="language-outline"
              label={item.label}
              subtitle={item.sub}
              active={locale === item.key}
              onPress={() => handleLocale(item.key)}
              right={locale === item.key ? <Ionicons name="checkmark-circle" size={20} color={greenman[7]} /> : undefined}
            />
          ))}
        </SettingSection>

        <SettingSection title="Тема">
          <View className="flex-row rounded-pill bg-sand-1 p-1">
            {([
              ['system', 'Система'],
              ['light', 'Светлая'],
              ['dark', 'Тёмная'],
            ] as const).map(([key, label]) => (
              <AnimatedPressable
                key={key}
                onPress={() => setTheme(key)}
                haptic="selection"
                wrapperStyle={{ flex: 1 }}
                className={`h-10 items-center justify-center rounded-pill ${theme === key ? 'bg-white' : ''}`}
              >
                <Text className={`text-[13px] font-semibold ${theme === key ? 'text-ink' : 'text-ink/50'}`}>
                  {label}
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        </SettingSection>

        {isAuth ? (
          <SettingSection title="Аккаунт">
            <SettingRow icon="person-outline" label="Изменить имя" onPress={() => router.push('/auth/profile')} />
            <SettingRow icon="call-outline" label="Изменить телефон" subtitle="Скоро" disabled />
          </SettingSection>
        ) : null}

        <SettingSection title="О приложении">
          <SettingRow icon="logo-whatsapp" label="Поддержка в WhatsApp" onPress={() => Linking.openURL('https://wa.me/77001234567')} />
          <SettingRow icon="mail-outline" label="Связаться с нами" onPress={() => Linking.openURL('mailto:hello@greenman.kz')} />
          <SettingRow icon="document-text-outline" label="Условия использования" onPress={() => Alert.alert('Условия использования', 'Текст условий будет добавлен в следующем релизе.')} />
          <SettingRow icon="shield-checkmark-outline" label="Политика конфиденциальности" onPress={() => Alert.alert('Политика конфиденциальности', 'Текст политики будет добавлен в следующем релизе.')} />
          <SettingRow icon="information-circle-outline" label="Версия" subtitle="1.0.0" disabled />
        </SettingSection>

        {isAuth ? (
          <View className="mt-2 gap-3">
            <Button label="Выйти из аккаунта" variant="secondary" full onPress={confirmLogout} />
            <Button
              label="Удалить аккаунт"
              variant="ghost"
              full
              disabled={deleteAccount.isPending}
              onPress={confirmDelete}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function SettingSection({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6">
      <Text variant="meta-upper" tracking="wide" className="mb-2 text-ink/50">
        {title}
      </Text>
      <View className="overflow-hidden rounded-lg bg-white" style={shadows.flat}>
        {children}
      </View>
      {caption ? <Text className="mt-2 text-[11px] leading-[14px] text-ink/50">{caption}</Text> : null}
    </View>
  );
}

function SettingRow({
  icon,
  iconNode,
  label,
  subtitle,
  active,
  disabled,
  right,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconNode?: React.ReactNode;
  label: string;
  subtitle?: string | React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View className={`min-h-14 flex-row items-center gap-3 border-b border-border px-4 py-3 ${active ? 'bg-greenman-0' : 'bg-white'} ${disabled ? 'opacity-45' : ''}`}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-sand-1">
        {iconNode ?? (icon ? <Ionicons name={icon} size={18} color={active ? greenman[7] : ink.DEFAULT} /> : null)}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold text-ink">{label}</Text>
        {typeof subtitle === 'string' ? (
          <Text className="mt-0.5 text-[11px] text-ink/50">{subtitle}</Text>
        ) : subtitle ? (
          <View className="mt-1 self-start">{subtitle}</View>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={17} color={sand[4]} /> : null)}
    </View>
  );

  if (!onPress) return content;
  return (
    <AnimatedPressable onPress={onPress} disabled={disabled} haptic="selection" scale={0.98}>
      {content}
    </AnimatedPressable>
  );
}
