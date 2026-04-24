import { View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';

export function FeedSkeleton() {
  return (
    <View>
      <View className="flex-row gap-3 px-3 py-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-16 rounded-full" />
        ))}
      </View>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          className="mx-3 mb-3 overflow-hidden rounded-2xl bg-white"
        >
          <View className="flex-row items-center gap-3 p-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <View className="flex-1">
              <Skeleton className="h-3 w-1/3 rounded-md" />
              <Skeleton className="mt-1.5 h-2 w-1/4 rounded-md" />
            </View>
          </View>
          <Skeleton className="h-64 w-full rounded-none" />
          <View className="p-3">
            <Skeleton className="h-3 w-4/5 rounded-md" />
            <Skeleton className="mt-2 h-3 w-3/5 rounded-md" />
          </View>
        </View>
      ))}
    </View>
  );
}
