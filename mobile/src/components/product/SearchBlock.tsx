import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { cssInterop } from 'nativewind';
import type { SearchType } from '@/hooks/useProducts';

cssInterop(TextInput, { className: 'style' });

type Props = {
  initialType?: SearchType;
  autoFocus?: boolean;
  onSubmit?: (type: SearchType, query: string) => void;
};

export function SearchBlock({ initialType = 'name', autoFocus, onSubmit }: Props) {
  const router = useRouter();
  const [type, setType] = useState<SearchType>(initialType);
  const [query, setQuery] = useState('');

  const submit = () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    Haptics.selectionAsync().catch(() => {});
    if (onSubmit) {
      onSubmit(type, trimmed);
    } else {
      router.push(`/search/${type}/${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        <Tab label="По названию" active={type === 'name'} onPress={() => setType('name')} />
        <Tab label="По болезни" active={type === 'disease'} onPress={() => setType('disease')} />
      </View>
      <View className="flex-row items-center rounded-xl border border-border bg-white px-4">
        <TextInput
          autoFocus={autoFocus}
          placeholder={type === 'name' ? 'Например, ромашка' : 'Например, кашель'}
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          returnKeyType="search"
          className="h-12 flex-1 text-base text-ink font-sans"
        />
        <Pressable onPress={submit} className="ml-2 rounded-md bg-greenman-6 px-4 py-2">
          <Text className="text-sm font-bold text-white">Найти</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-4 py-2 ${active ? 'bg-greenman-7' : 'bg-greenman-0'}`}
    >
      <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-greenman-8'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
