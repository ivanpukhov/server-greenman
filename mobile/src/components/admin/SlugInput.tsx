import { View, TextInput } from 'react-native';
import { Text } from '@/components/ui/Text';

type Props = {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
};

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ә: 'a', ғ: 'g', қ: 'k', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i',
};

export function slugify(input: string): string {
  const lower = input.toLowerCase();
  let out = '';
  for (const ch of lower) {
    out += TRANSLIT[ch] ?? ch;
  }
  return out
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function SlugInput({ label = 'Slug', value, onChange, hint }: Props) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-semibold text-ink-dim">{label}</Text>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
        placeholder="my-slug"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
        className="h-12 rounded-xl border border-border bg-white px-3 text-base text-ink"
      />
      {hint ? <Text className="mt-1 text-xs text-ink-dim">{hint}</Text> : null}
    </View>
  );
}
