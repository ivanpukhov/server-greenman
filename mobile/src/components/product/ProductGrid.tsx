import { View } from 'react-native';
import { ProductCard } from './ProductCard';
import { Shimmer } from '@/components/ui/Shimmer';
import type { Product } from '@/lib/api/types';

type Props = {
  products: Product[];
  columns?: number;
};

export function ProductGrid({ products, columns = 2 }: Props) {
  const rows: Product[][] = [];
  for (let i = 0; i < products.length; i += columns) {
    rows.push(products.slice(i, i + columns));
  }

  return (
    <View className="gap-4">
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row gap-3">
          {row.map((p) => (
            <ProductCard key={p.id} product={p} variant="grid" />
          ))}
          {Array.from({ length: columns - row.length }).map((_, idx) => (
            <View key={`spacer-${idx}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}

export function ProductGridSkeleton({
  rows = 3,
  columns = 2,
}: {
  rows?: number;
  columns?: number;
}) {
  const totalCells = rows * columns;
  const grouped: number[][] = [];
  for (let i = 0; i < totalCells; i += columns) {
    grouped.push(Array.from({ length: columns }, (_, k) => i + k));
  }

  return (
    <View className="gap-4">
      {grouped.map((row, ri) => (
        <View key={ri} className="flex-row gap-3">
          {row.map((k) => (
            <View key={k} className="flex-1 overflow-hidden rounded-lg bg-surface">
              <Shimmer style={{ aspectRatio: 4 / 5 }} />
              <View className="gap-2 p-3">
                <Shimmer style={{ height: 12, borderRadius: 6 }} />
                <Shimmer style={{ height: 12, width: '60%', borderRadius: 6 }} />
                <Shimmer style={{ height: 18, width: '50%', borderRadius: 6, marginTop: 4 }} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
