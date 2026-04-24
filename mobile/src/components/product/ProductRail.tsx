import { FlatList, View } from 'react-native';
import { ProductCard } from './ProductCard';
import { Shimmer } from '@/components/ui/Shimmer';
import type { Product } from '@/lib/api/types';

type Size = 'compact' | 'rail' | 'hero';

type Props = {
  products: Product[];
  size?: Size;
  loading?: boolean;
};

const W: Record<Size, number> = {
  compact: 150,
  rail: 180,
  hero: 260,
};

export function ProductRail({ products, size = 'rail', loading }: Props) {
  if (loading) {
    return (
      <View className="flex-row gap-3 pl-5">
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: W[size] }} className="gap-2">
            <Shimmer style={{ height: W[size], borderRadius: 20 }} />
            <Shimmer style={{ height: 14, width: W[size] - 30, borderRadius: 8 }} />
            <Shimmer style={{ height: 20, width: W[size] - 60, borderRadius: 8 }} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, gap: 14 }}
      snapToInterval={W[size] + 14}
      decelerationRate="fast"
      renderItem={({ item }) => <ProductCard product={item} variant={size} width={W[size]} />}
    />
  );
}
