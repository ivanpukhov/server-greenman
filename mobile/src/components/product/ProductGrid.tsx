import { View } from 'react-native';
import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/Skeleton';
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
    <View className="gap-3">
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row gap-3">
          {row.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          {Array.from({ length: columns - row.length }).map((_, idx) => (
            <View key={`spacer-${idx}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}

export function ProductGridSkeleton({ rows = 3, columns = 2 }: { rows?: number; columns?: number }) {
  const cells = Array.from({ length: rows * columns });
  const grouped: number[][] = [];
  for (let i = 0; i < cells.length; i += columns) {
    grouped.push(cells.map((_, idx) => idx).slice(i, i + columns));
  }

  return (
    <View className="gap-3">
      {grouped.map((row, ri) => (
        <View key={ri} className="flex-row gap-3">
          {row.map((k) => (
            <View key={k} className="flex-1 overflow-hidden rounded-xl border border-border bg-white">
              <Skeleton className="aspect-square rounded-none" />
              <View className="p-3">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="mt-2 h-4 w-2/3 rounded" />
                <Skeleton className="mt-3 h-5 w-1/2 rounded" />
              </View>
            </View>
          ))}
          {Array.from({ length: columns - row.length }).map((_, idx) => (
            <View key={`spacer-${idx}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}
