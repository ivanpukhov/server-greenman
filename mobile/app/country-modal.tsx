import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useCountryStore, type Country } from '@/stores/country.store';
import * as Haptics from 'expo-haptics';

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
          <CountryCard flag="🇰🇿" label="Казахстан" currency="KZT" sub="Kaspi · Казпочта · inDrive" onPress={() => choose('KZ')} />
          <CountryCard flag="🇷🇺" label="Россия" currency="RUB" sub="СДЭК · Наложенный платёж" onPress={() => choose('RF')} />
        </View>
      </View>
    </Screen>
  );
}

function CountryCard({
  flag,
  label,
  currency,
  sub,
  onPress,
}: {
  flag: string;
  label: string;
  currency: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-xl border border-border bg-white p-5 active:bg-greenman-0"
    >
      <View className="h-12 w-12 items-center justify-center rounded-lg bg-sand-1">
        <Text className="text-[24px]">{flag}</Text>
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold text-ink">{label}</Text>
          <Text className="rounded-md bg-greenman-0 px-2 py-0.5 text-[11px] font-bold text-greenman-8">
            {currency}
          </Text>
        </View>
        <Text className="mt-1 text-sm text-ink-dim" numberOfLines={1}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#5b6360" />
    </Pressable>
  );
}
