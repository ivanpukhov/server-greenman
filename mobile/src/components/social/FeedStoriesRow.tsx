import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { StoryRing } from '@/components/ui/StoryRing';
import { greenman } from '@/theme/colors';

type MediaObj = { url?: string | null } | null | undefined;

export type StoryGroupItem = {
  id?: string;
  categorySlug?: string;
  categoryTitle?: string;
  categoryOrder?: number;
  adminUserId: number;
  adminName?: string | null;
  adminAvatar?: MediaObj;
  viewedAll?: boolean;
  stories?: Array<{ id: number; media?: MediaObj; viewed?: boolean }>;
};

type Props = {
  groups: StoryGroupItem[];
};

export function FeedStoriesRow({ groups }: Props) {
  if (!groups.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14, gap: 14 }}
    >
      {groups.map((g) => {
        const first = g.stories?.[0];
        const preview = g.adminAvatar?.url ?? first?.media?.url ?? null;
        const seen = g.viewedAll ?? g.stories?.every((s) => s.viewed) ?? false;
        return (
          <AnimatedPressable
            key={g.categorySlug ?? g.id ?? String(g.adminUserId)}
            onPress={() => first?.id && router.push(`/social/story/${first.id}`)}
            haptic="selection"
            scale={0.92}
            wrapperClassName="items-center"
            accessibilityRole="button"
            accessibilityLabel={g.categoryTitle ?? g.adminName ?? 'Сториз'}
          >
            <StoryRing size={68} seen={seen}>
              {preview ? (
                <Image
                  source={{ uri: preview }}
                  style={{ flex: 1 }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View className="flex-1 items-center justify-center bg-sand-1">
                  <Ionicons name="leaf" size={22} color={greenman[8]} />
                </View>
              )}
            </StoryRing>
            <Text
              className="mt-2 max-w-[72px] text-center text-[11px] font-semibold text-ink"
              numberOfLines={1}
            >
              {g.categoryTitle ?? g.adminName ?? 'Greenman'}
            </Text>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}
