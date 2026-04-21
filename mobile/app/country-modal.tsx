import { View, Pressable } from 'react-native';
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
          <CountryCard label="Казахстан" sub="KZT · Kaspi · Казпочта · inDrive" onPress={() => choose('KZ')} />
          <CountryCard label="Россия" sub="RUB · СДЭК · Наложенный платёж" onPress={() => choose('RF')} />
        </View>
      </View>
    </Screen>
  );
}

function CountryCard({ label, sub, onPress }: { label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl border border-border bg-white p-5 active:bg-greenman-0"
    >
      <Text className="text-lg font-bold text-ink">{label}</Text>
      <Text className="mt-1 text-sm text-ink-dim">{sub}</Text>
    </Pressable>
  );
}
