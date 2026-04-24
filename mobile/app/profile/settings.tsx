import { View, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useAuthStore } from '@/stores/auth.store';
import { useCountryStore } from '@/stores/country.store';
import { setLocale, getLocale, type AppLocale } from '@/i18n';
import { ink, sand, greenman, clay } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { useState } from 'react';

const LANGUAGES: { key: AppLocale; label: string; sub: string }[] = [
  { key: 'ru', label: 'Русский', sub: 'Основной язык' },
  { key: 'kz', label: 'Қазақша', sub: 'Қазақстан' },
  { key: 'en', label: 'English', sub: 'International' },
];

const COUNTRIES: { key: 'KZ' | 'RF'; label: string; flag: string; currency: string }[] = [
  { key: 'KZ', label: 'Казахстан', flag: '🇰🇿', currency: 'KZT' },
  { key: 'RF', label: 'Россия', flag: '🇷🇺', currency: 'RUB' },
];

export default function SettingsScreen() {
  const logout = useAuthStore((s) => s.logout);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const country = useCountryStore((s) => s.country);
  const setCountry = useCountryStore((s) => s.setCountry);
  const [locale, setLocaleState] = useState<AppLocale>(getLocale());

  const handleLocale = (l: AppLocale) => {
    setLocale(l);
    setLocaleState(l);
  };

  const confirmLogout = () => {
    Alert.alert('Выход', 'Выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => { logout(); router.back(); } },
    ]);
  };

  return (
    <Screen>
      <Header title="Настройки" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 }}
      >
        <SettingSection title="Страна и валюта">
          <View className="gap-2">
            {COUNTRIES.map((c, i) => (
              <AnimatedPressable
                key={c.key}
                onPress={() => setCountry(c.key)}
                haptic="selection"
                wrapperStyle={shadows.flat}
              >
                <View
                  className={`flex-row items-center gap-4 rounded-xl px-4 py-3.5 ${
                    country === c.key ? 'bg-ink' : 'bg-white'
                  }`}
                >
                  <Text style={{ fontSize: 26 }}>{c.flag}</Text>
                  <View className="flex-1">
                    <Text
                      className={`text-[16px] font-bold ${country === c.key ? 'text-white' : 'text-ink'}`}
                      tracking="tight"
                    >
                      {c.label}
                    </Text>
                    <Text
                      className={`text-[12px] ${country === c.key ? 'text-white/70' : 'text-ink/50'}`}
                      tracking="tight"
                    >
                      {c.currency}
                    </Text>
                  </View>
                  {country === c.key ? (
                    <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                  ) : (
                    <View className="h-5 w-5 rounded-pill border-2 border-sand-3" />
                  )}
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </SettingSection>

        <SettingSection title="Язык интерфейса">
          <View className="gap-2">
            {LANGUAGES.map((l) => (
              <AnimatedPressable
                key={l.key}
                onPress={() => handleLocale(l.key)}
                haptic="selection"
                wrapperStyle={shadows.flat}
              >
                <View
                  className={`flex-row items-center gap-4 rounded-xl px-4 py-3.5 ${
                    locale === l.key ? 'bg-greenman-9' : 'bg-white'
                  }`}
                >
                  <View
                    className="h-10 w-10 items-center justify-center rounded-pill"
                    style={{
                      backgroundColor:
                        locale === l.key ? 'rgba(255,255,255,0.15)' : sand[1],
                    }}
                  >
                    <Ionicons
                      name="language"
                      size={18}
                      color={locale === l.key ? '#ffffff' : ink.DEFAULT}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-[16px] font-bold ${locale === l.key ? 'text-white' : 'text-ink'}`}
                      tracking="tight"
                    >
                      {l.label}
                    </Text>
                    <Text
                      className={`text-[12px] ${locale === l.key ? 'text-white/70' : 'text-ink/50'}`}
                      tracking="tight"
                    >
                      {l.sub}
                    </Text>
                  </View>
                  {locale === l.key ? (
                    <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                  ) : (
                    <View className="h-5 w-5 rounded-pill border-2 border-sand-3" />
                  )}
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </SettingSection>

        {isAuth ? (
          <View className="mt-8">
            <AnimatedPressable onPress={confirmLogout} haptic="medium">
              <View
                className="flex-row items-center gap-3 rounded-xl bg-white px-4 py-3.5"
                style={shadows.flat}
              >
                <View className="h-10 w-10 items-center justify-center rounded-pill bg-sand-1">
                  <Ionicons name="log-out-outline" size={20} color="#b00020" />
                </View>
                <Text className="flex-1 text-[16px] font-bold" style={{ color: '#b00020' }}>
                  Выйти из аккаунта
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text variant="meta-upper" tracking="widest" className="mb-3 text-ink/50">
        {title}
      </Text>
      {children}
    </View>
  );
}
