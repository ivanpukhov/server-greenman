import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useCountryStore, type Country } from '@/stores/country.store';
import * as Haptics from 'expo-haptics';
import { CountryMark, CurrencyMark } from '@/components/ui/CountryMark';

export default function CountryModal() {
  const router = useRouter();
  const setCountry = useCountryStore((s) => s.setCountry);
  const markChosen = useCountryStore((s) => s.markChosen);

  const choose = (c: Country) => {
    Haptics.selectionAsync().catch(() => {});
    setCountry(c);
    markChosen();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View className="flex-1 px-5 py-8">
        <Text className="text-3xl font-display text-ink">Выберите страну</Text>
        <Text className="mt-2 text-base text-ink-dim">
          От этого зависят способы доставки, оплата и валюта.
        </Text>

        <View className="mt-8 gap-3">
          <CountryCard country="KZ" label="Казахстан" sub="Kaspi · Казпочта · inDrive" onPress={() => choose('KZ')} />
          <CountryCard country="RF" label="Россия" sub="СДЭК · Наложенный платёж" onPress={() => choose('RF')} />
        </View>
      </View>
    </Screen>
  );
}

function CountryCard({
  country,
  label,
  sub,
  onPress,
}: {
  country: Country;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-xl border border-border bg-white p-4 active:bg-greenman-0"
    >
      <CountryMark country={country} size="lg" />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold text-ink">{label}</Text>
          <CurrencyMark country={country} />
        </View>
        <Text className="mt-1 text-sm text-ink-dim" numberOfLines={1}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#5b6360" />
    </Pressable>
  );
}
