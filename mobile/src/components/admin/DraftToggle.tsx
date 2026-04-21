import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';

type Props = {
  isDraft: boolean;
  onChange: (v: boolean) => void;
  publishedAt?: string | null;
};

export function DraftToggle({ isDraft, onChange, publishedAt }: Props) {
  return (
    <View className="rounded-xl border border-border bg-white p-3">
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => onChange(false)}
          className={`flex-1 rounded-lg py-2 ${!isDraft ? 'bg-greenman-7' : 'bg-greenman-0'}`}
        >
          <Text
            className={`text-center text-sm font-semibold ${!isDraft ? 'text-white' : 'text-greenman-8'}`}
          >
            Опубликовано
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChange(true)}
          className={`flex-1 rounded-lg py-2 ${isDraft ? 'bg-orange-500' : 'bg-greenman-0'}`}
        >
          <Text
            className={`text-center text-sm font-semibold ${isDraft ? 'text-white' : 'text-greenman-8'}`}
          >
            Черновик
          </Text>
        </Pressable>
      </View>
      {publishedAt ? (
        <Text className="mt-2 text-xs text-ink-dim">
          Опубликовано: {new Date(publishedAt).toLocaleString('ru-RU')}
        </Text>
      ) : null}
    </View>
  );
}
