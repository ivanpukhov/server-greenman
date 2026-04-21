import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { greenman } from '@/theme/colors';

type Props = {
  title: string;
  subtitle?: string;
  isDraft?: boolean;
  leading?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function AdminListItem({
  title,
  subtitle,
  isDraft,
  leading,
  onPress,
  onLongPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="flex-row items-center gap-3 rounded-xl border border-border bg-white p-3 active:bg-greenman-0"
    >
      {leading ? <View>{leading}</View> : null}
      <View className="flex-1">
        <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
          {title || <Text className="text-ink-dim">(без названия)</Text>}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-ink-dim" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {isDraft ? (
        <View className="rounded-full bg-orange-100 px-2 py-0.5">
          <Text className="text-[10px] font-semibold text-orange-700">Черновик</Text>
        </View>
      ) : (
        <View className="rounded-full bg-greenman-0 px-2 py-0.5">
          <Text className="text-[10px] font-semibold text-greenman-8">Опубликовано</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={greenman[7]} />
    </Pressable>
  );
}
