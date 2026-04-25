import { View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { greenman, sand } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

type Props = {
  title: string;
  eyebrow: string;
  meta?: string;
  cover?: string | null;
  blurhash?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function ProfileContentRow({
  title,
  eyebrow,
  meta,
  cover,
  blurhash,
  icon = 'bookmark-outline',
  onPress,
}: Props) {
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="selection"
      scale={0.98}
      wrapperStyle={shadows.flat}
      className="mx-4 rounded-lg bg-white p-3"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-20 w-20 overflow-hidden rounded-md bg-sand-1">
          {cover ? (
            <Image
              source={{ uri: cover }}
              placeholder={blurhash ? { blurhash } : undefined}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={120}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name={icon} size={24} color={sand[4]} />
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <View className="h-1.5 w-1.5 rounded-full bg-greenman-7" />
            <Text variant="meta-upper" tracking="wide" className="text-greenman-7">
              {eyebrow}
            </Text>
          </View>
          <Text numberOfLines={2} className="mt-1 text-[15px] font-semibold leading-[20px] text-ink">
            {title}
          </Text>
          {meta ? (
            <Text numberOfLines={1} className="mt-1 text-[11px] text-ink/50">
              {meta}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={sand[4]} />
      </View>
    </AnimatedPressable>
  );
}
