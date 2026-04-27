import { useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';
import { ProductPlaceholder } from '@/components/ui/ProductPlaceholder';
import { greenman, ink } from '@/theme/colors';
import type { Product } from '@/lib/api/types';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
  product: Product;
  height?: number;
};

function galleryItems(product: Product) {
  const aliases = [product.alias, ...(product.types ?? []).map((t) => t.alias)].filter(Boolean) as string[];
  const unique = Array.from(new Set(aliases));
  return unique.length ? unique : [product.alias ?? product.name];
}

export function ProductGallery({ product, height = SCREEN_W }: Props) {
  const pages = galleryItems(product);
  const [active, setActive] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_W);
    setActive(Math.max(0, Math.min(next, pages.length - 1)));
  };

  return (
    <View style={{ height, width: SCREEN_W }} className="relative bg-sand-1">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        accessibilityRole="adjustable"
        accessibilityLabel="Галерея товара"
      >
        {pages.map((alias, index) => (
          <View key={`${alias}-${index}`} style={{ width: SCREEN_W, height }}>
            <ProductPlaceholder
              name={product.name}
              alias={alias}
              size="detail"
              className="h-full w-full"
            />
          </View>
        ))}
      </ScrollView>

      {pages.length > 1 ? (
        <View className="absolute bottom-4 left-0 right-0 flex-row items-center justify-center gap-1.5">
          {pages.map((_, index) => (
            <View
              key={index}
              style={{
                width: active === index ? 16 : 6,
                height: 6,
                borderRadius: 999,
                backgroundColor: active === index ? greenman[7] : ink[20],
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
