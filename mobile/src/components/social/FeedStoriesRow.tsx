import { ScrollView, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { greenman } from '@/theme/colors';

type MediaObj = { url?: string | null } | null | undefined;

export type StoryGroupItem = {
  adminUserId: number;
  adminName?: string | null;
  adminAvatar?: MediaObj;
  viewedAll?: boolean;
  stories?: Array<{
    id: number;
    media?: MediaObj;
    viewed?: boolean;
  }>;
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
      contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, gap: 14 }}
    >
      {groups.map((g) => {
        const first = g.stories?.[0];
        const preview = g.adminAvatar?.url ?? first?.media?.url ?? null;
        const viewed = g.viewedAll ?? g.stories?.every((s) => s.viewed);
        const ringColor = viewed ? '#d1d5db' : greenman[7];
        return (
          <Pressable
            key={g.adminUserId}
            onPress={() => first?.id && router.push(`/social/story/${first.id}`)}
            accessibilityRole="button"
            accessibilityLabel={g.adminName ?? 'Сториз'}
            className="items-center active:opacity-70"
            style={{ width: 72 }}
          >
            <View
              className="items-center justify-center rounded-full p-[2px]"
              style={{ borderColor: ringColor, borderWidth: 2 }}
            >
              <View className="h-16 w-16 overflow-hidden rounded-full bg-greenman-0">
                {preview ? (
                  <Image
                    source={{ uri: preview }}
                    style={{ flex: 1 }}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="leaf" size={22} color={greenman[7]} />
                  </View>
                )}
              </View>
            </View>
            <Text
              className="mt-1 text-[11px] text-ink"
              numberOfLines={1}
              style={{ maxWidth: 72, textAlign: 'center' }}
            >
              {g.adminName ?? 'Greenman'}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
