import { View } from 'react-native';
import { Shimmer } from '@/components/ui/Shimmer';

export function FeedSkeleton() {
  return (
    <View className="px-4 pt-2">
      <View className="flex-row gap-3 pb-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} className="items-center gap-2">
            <Shimmer style={{ height: 68, width: 68, borderRadius: 34 }} />
            <Shimmer style={{ height: 10, width: 48, borderRadius: 6 }} />
          </View>
        ))}
      </View>
      <View className="mb-4 overflow-hidden rounded-xl bg-surface">
        <View className="flex-row items-center gap-3 p-4">
          <Shimmer style={{ height: 40, width: 40, borderRadius: 20 }} />
          <View className="flex-1 gap-1.5">
            <Shimmer style={{ height: 12, width: '45%', borderRadius: 6 }} />
            <Shimmer style={{ height: 10, width: '25%', borderRadius: 6 }} />
          </View>
        </View>
        <Shimmer style={{ aspectRatio: 4 / 5 }} />
      </View>
      <View className="mb-4 flex-row gap-3 rounded-xl bg-surface-cream p-4">
        <Shimmer style={{ height: 96, width: 96, borderRadius: 16 }} />
        <View className="flex-1 justify-center gap-2">
          <Shimmer style={{ height: 10, width: '30%', borderRadius: 6 }} />
          <Shimmer style={{ height: 16, width: '90%', borderRadius: 6 }} />
          <Shimmer style={{ height: 16, width: '70%', borderRadius: 6 }} />
        </View>
      </View>
    </View>
  );
}
