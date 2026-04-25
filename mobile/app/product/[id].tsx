import { useMemo, useState } from 'react';
import { Share, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Header } from '@/components/ui/Header';
import { Shimmer } from '@/components/ui/Shimmer';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { StickyCTA } from '@/components/ui/StickyCTA';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductRail } from '@/components/product/ProductRail';
import { useProduct, useProductReviews, useProducts } from '@/hooks/useProducts';
import { useCartStore } from '@/stores/cart.store';
import { useCountryStore } from '@/stores/country.store';
import { formatPrice } from '@/lib/format/price';
import { greenman, ink, sand, sun } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import type { ProductRating, ProductType } from '@/lib/api/types';

function minType(types: ProductType[]) {
  if (!types.length) return null;
  return types.reduce((min, type) => (type.price < min.price ? type : min), types[0]);
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollY = useSharedValue(0);
  const currency = useCountryStore((s) => s.currency);
  const add = useCartStore((s) => s.add);
  const cartItems = useCartStore((s) => s.items);
  const { data: product, isLoading, isError, refetch } = useProduct(id);
  const reviews = useProductReviews(id);
  const products = useProducts();
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const types = product?.types ?? [];
  const selectedType = useMemo(() => {
    if (!types.length) return null;
    if (selectedTypeId != null) return types.find((t) => t.id === selectedTypeId) ?? minType(types);
    return minType(types);
  }, [types, selectedTypeId]);

  const related = useMemo(
    () => (products.data ?? []).filter((p) => p.id !== product?.id).slice(0, 8),
    [products.data, product?.id],
  );

  if (isLoading) {
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="" transparent floating scrollOffset={scrollY} />
        <View>
          <Shimmer style={{ aspectRatio: 1, width: '100%' }} />
          <View className="px-5 pt-6">
            <Shimmer style={{ height: 28, width: '80%', borderRadius: 10 }} />
            <Shimmer style={{ height: 18, width: '52%', borderRadius: 8, marginTop: 12 }} />
            <Shimmer style={{ height: 40, width: '44%', borderRadius: 10, marginTop: 16 }} />
            <Shimmer style={{ height: 64, width: '100%', borderRadius: 16, marginTop: 20 }} />
          </View>
        </View>
      </Screen>
    );
  }

  if (isError || !product) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Товар" />
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-sand-1">
            <Ionicons name="alert-circle-outline" size={40} color={sand[4]} />
          </View>
          <Text className="mt-6 font-display text-[22px] leading-[28px] text-ink">
            Не удалось загрузить
          </Text>
          <Text className="mt-2 text-center text-[15px] leading-[22px] text-ink/60">
            Проверьте соединение или попробуйте позже.
          </Text>
          <Button label="Повторить" className="mt-6" onPress={() => refetch()} />
        </View>
      </Screen>
    );
  }

  const rating = reviews.data?.rating ?? product.rating;
  const diseases = product.diseases ?? [];
  const totalPrice = selectedType ? selectedType.price * qty : 0;
  const inCart = selectedType
    ? cartItems.some((item) => item.productId === product.id && item.type.id === selectedType.id)
    : false;

  const addToCart = () => {
    if (!selectedType) return;
    add(
      {
        productId: product.id,
        productName: product.name,
        type: { id: selectedType.id, type: selectedType.type, price: selectedType.price },
      },
      qty,
    );
    setJustAdded(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Toast.show({
      type: 'success',
      text1: 'Добавлено в корзину',
      text2: `${product.name} · ${selectedType.type} × ${qty}`,
    });
    setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title={product.name}
        transparent
        floating
        scrollOffset={scrollY}
        rightAction={
          <IconButton
            icon={<Ionicons name="share-outline" size={20} color={ink.DEFAULT} />}
            tone="inverse"
            size="md"
            accessibilityLabel="Поделиться"
            onPress={() => Share.share({ title: product.name, message: product.name })}
          />
        }
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 128 }}
      >
        <ProductGallery product={product} />

        <View className="px-5 pt-5">
          <View className="flex-row flex-wrap gap-2">
            <Chip label="Хит сезона" size="xs" selected tone="sun" />
            {types.length > 1 ? <Chip label="Есть варианты" size="xs" tone="primary" /> : null}
          </View>

          <Text className="mt-3 font-display text-[28px] leading-[34px] text-ink" numberOfLines={3}>
            {product.name}
          </Text>
          <Text variant="meta-upper" className="mt-2 text-ink/50" tracking="wide">
            Травяной сбор
          </Text>

          <RatingSummary rating={rating} />

          <View className="mt-4 flex-row items-baseline gap-2">
            <Text className="font-display text-[34px] leading-[40px] text-ink">
              {selectedType ? formatPrice(selectedType.price, currency) : 'Нет в наличии'}
            </Text>
            {types.length > 1 ? (
              <Text className="text-[13px] font-semibold text-ink/50">за {selectedType?.type}</Text>
            ) : null}
          </View>

          {types.length > 1 ? (
            <View className="mt-5">
              <Text className="mb-3 text-[13px] font-semibold text-ink/60">
                Выберите вариант
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {types.map((type) => {
                  const selected = selectedType?.id === type.id;
                  return (
                    <AnimatedPressable
                      key={type.id}
                      onPress={() => setSelectedTypeId(type.id)}
                      haptic="selection"
                      scale={0.97}
                      wrapperStyle={{ width: '48%' }}
                      className={`min-h-16 rounded-md border p-3 ${
                        selected ? 'border-greenman-7 bg-greenman-0' : 'border-ink/10 bg-white'
                      }`}
                    >
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="flex-1">
                          <Text className="text-[13px] font-semibold text-ink" numberOfLines={1}>
                            {type.type}
                          </Text>
                          <Text className="mt-1 font-display text-[15px] leading-[20px] text-ink">
                            {formatPrice(type.price, currency)}
                          </Text>
                        </View>
                        {selected ? <Ionicons name="checkmark-circle" size={16} color={greenman[7]} /> : null}
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {diseases.length ? (
            <Section title="Помогает при">
              <View className="flex-row flex-wrap gap-2">
                {diseases.map((disease, index) => (
                  <Chip
                    key={`${disease}-${index}`}
                    label={disease}
                    size="sm"
                    tone="ink"
                    onPress={() => router.push(`/search/disease/${encodeURIComponent(disease)}` as any)}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          <View className="mt-6 flex-row gap-2">
            {['Описание', 'Применение', 'Состав', 'Доставка', 'Отзывы'].map((label, index) => (
              <Chip key={label} label={label} size="xs" selected={index === 0} tone="primary" />
            ))}
          </View>

          {product.description ? (
            <InfoSection title="Описание" icon="document-text-outline" body={product.description} />
          ) : null}
          {product.applicationMethodAdults || product.applicationMethodChildren ? (
            <View className="mt-8">
              <Text className="font-display text-[22px] leading-[28px] text-ink">Как принимать</Text>
              {product.applicationMethodAdults ? (
                <InfoCard title="Взрослым" icon="person-outline" body={product.applicationMethodAdults} />
              ) : null}
              {product.applicationMethodChildren ? (
                <InfoCard title="Детям" icon="happy-outline" body={product.applicationMethodChildren} />
              ) : null}
            </View>
          ) : null}
          {product.contraindications ? (
            <View className="mt-4 rounded-md border border-warning/40 bg-sun-0 p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="warning-outline" size={20} color="#c78412" />
                <Text className="text-[13px] font-semibold text-ink">Противопоказания</Text>
              </View>
              <Text className="mt-2 text-[15px] leading-[22px] text-ink/80">
                {product.contraindications}
              </Text>
            </View>
          ) : null}

          <DeliverySection />
          <ReviewsSection rating={rating} count={reviews.data?.reviews.length ?? 0} />

          {related.length ? (
            <View className="mt-8">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="font-display text-[22px] leading-[28px] text-ink">
                  Вам понравится
                </Text>
                <Text className="text-[13px] font-semibold text-greenman-7">Все</Text>
              </View>
              <View className="-mx-5">
                <ProductRail products={related} />
              </View>
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>

      <StickyCTA>
        <View className="flex-row items-center gap-3">
          <View className="h-11 flex-row items-center rounded-pill border border-ink/10 bg-white px-1">
            <AnimatedPressable
              onPress={() => setQty((value) => Math.max(1, value - 1))}
              disabled={qty <= 1}
              haptic="light"
              className="h-9 w-9 items-center justify-center rounded-full"
            >
              <Ionicons name="remove" size={20} color={qty <= 1 ? ink[40] : ink.DEFAULT} />
            </AnimatedPressable>
            <Text className="w-7 text-center text-[17px] font-semibold text-ink">{qty}</Text>
            <AnimatedPressable
              onPress={() => setQty((value) => value + 1)}
              haptic="light"
              className="h-9 w-9 items-center justify-center rounded-full"
            >
              <Ionicons name="add" size={20} color={ink.DEFAULT} />
            </AnimatedPressable>
          </View>
          <Button
            label={
              inCart
                ? 'В корзине · перейти'
                : justAdded
                ? 'В корзине'
                : selectedType
                ? `Добавить · ${formatPrice(totalPrice, currency)}`
                : 'Нет в наличии'
            }
            disabled={!selectedType}
            loading={false}
            full
            className="flex-1"
            iconLeft={
              <Ionicons
                name={inCart || justAdded ? 'checkmark' : 'bag-add-outline'}
                size={20}
                color="#fff"
              />
            }
            onPress={inCart ? () => router.push('/cart') : addToCart}
          />
        </View>
      </StickyCTA>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-6">
      <Text className="mb-3 text-[13px] font-semibold text-ink/60">{title}</Text>
      {children}
    </View>
  );
}

function RatingSummary({ rating }: { rating?: ProductRating }) {
  const count = rating?.count ?? 0;
  const average = rating?.average ?? 0;

  return (
    <View className="mt-3 flex-row items-center gap-2">
      <View className="flex-row items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Ionicons
            key={index}
            name={index < Math.round(average) ? 'star' : 'star-outline'}
            size={14}
            color={count ? sun[2] : ink[20]}
          />
        ))}
      </View>
      <Text className="text-[13px] font-semibold text-ink">
        {count ? average.toFixed(1) : 'Нет оценок'}
      </Text>
      <Text className="text-[13px] text-ink/60">
        {count ? `· ${count} отзывов` : '· Будьте первым'}
      </Text>
    </View>
  );
}

function InfoSection({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="mt-8">
      <View className="mb-3 flex-row items-center gap-2">
        <Ionicons name={icon} size={20} color={greenman[7]} />
        <Text className="font-display text-[22px] leading-[28px] text-ink">{title}</Text>
      </View>
      <Text className="text-[15px] leading-[22px] text-ink/80">{body}</Text>
    </View>
  );
}

function InfoCard({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="mt-3 rounded-md bg-sand-1 p-4">
      <View className="flex-row items-center gap-2">
        <Ionicons name={icon} size={20} color={greenman[7]} />
        <Text className="text-[13px] font-semibold text-ink">{title}</Text>
      </View>
      <Text className="mt-2 text-[15px] leading-[22px] text-ink/80">{body}</Text>
    </View>
  );
}

function DeliverySection() {
  const rows = [
    ['cube-outline', 'Казпочта — от 1800 ₸ · 3-7 дней'],
    ['bicycle-outline', 'Курьер по городу — 1500 ₸'],
    ['car-outline', 'inDrive — 4000 ₸ для избранных городов'],
  ] as const;

  return (
    <View className="mt-8">
      <Text className="font-display text-[22px] leading-[28px] text-ink">Доставка</Text>
      <View className="mt-3 gap-2">
        {rows.map(([icon, label]) => (
          <View
            key={label}
            className="flex-row items-center gap-3 rounded-md border border-ink/10 bg-white p-3"
            style={shadows.flat}
          >
            <Ionicons name={icon} size={20} color={greenman[7]} />
            <Text className="flex-1 text-[13px] leading-[18px] text-ink/80">{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReviewsSection({ rating, count }: { rating?: ProductRating; count: number }) {
  return (
    <View className="mt-8 rounded-lg bg-white p-4" style={shadows.flat}>
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-[22px] leading-[28px] text-ink">Отзывы</Text>
        <Text className="text-[13px] font-semibold text-greenman-7">Все ({rating?.count ?? count})</Text>
      </View>
      <View className="mt-4 flex-row items-end gap-3">
        <Text className="font-display text-[34px] leading-[40px] text-ink">
          {(rating?.average ?? 0).toFixed(1)}
        </Text>
        <View className="pb-1">
          <RatingSummary rating={rating} />
        </View>
      </View>
      <Text className="mt-3 text-[13px] leading-[18px] text-ink/60">
        Отзывы покупателей появятся здесь после первых заказов с оценкой.
      </Text>
    </View>
  );
}
