import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { View, ScrollView, Dimensions, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Shimmer } from '@/components/ui/Shimmer';
import { Header } from '@/components/ui/Header';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ProductPlaceholder } from '@/components/ui/ProductPlaceholder';
import { useCreateProductReview, useProduct, useProductReviews } from '@/hooks/useProducts';
import { useCountryStore } from '@/stores/country.store';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { formatPrice } from '@/lib/format/price';
import { greenman, ink, sand } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import type { ProductRating, ProductReview } from '@/lib/api/types';

cssInterop(LinearGradient, { className: 'style' });

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = SCREEN_W;

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currency = useCountryStore((s) => s.currency);
  const add = useCartStore((s) => s.add);
  const cartItems = useCartStore((s) => s.items);
  const { data: product, isLoading, isError } = useProduct(id);
  const productReviews = useProductReviews(id);

  const types = product?.types ?? [];
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);

  const selectedType = useMemo(() => {
    if (!types.length) return null;
    if (selectedTypeId != null) return types.find((t) => t.id === selectedTypeId) ?? types[0];
    return types[0];
  }, [types, selectedTypeId]);

  if (isLoading) {
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="" floating />
        <View className="px-5 pt-16">
          <Shimmer style={{ aspectRatio: 1, width: '100%', borderRadius: 24 }} />
          <Shimmer style={{ height: 28, width: '75%', borderRadius: 8, marginTop: 24 }} />
          <Shimmer style={{ height: 22, width: '40%', borderRadius: 8, marginTop: 12 }} />
          <Shimmer style={{ height: 80, width: '100%', borderRadius: 14, marginTop: 20 }} />
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
          <View className="h-20 w-20 items-center justify-center rounded-pill bg-sand-1">
            <Ionicons name="alert-circle-outline" size={36} color={sand[4]} />
          </View>
          <Text
            variant="h2-serif"
            className="mt-6 text-center text-ink"
          >
            Не удалось загрузить
          </Text>
          <Text className="mt-2 text-center text-ink/60" tracking="tight">
            Проверьте соединение или попробуйте позже.
          </Text>
        </View>
      </Screen>
    );
  }

  const diseases = product.diseases ?? [];
  const hasMultiple = types.length > 1;
  const totalPrice = selectedType ? selectedType.price * qty : 0;
  const inCart = selectedType
    ? cartItems.some((i) => i.productId === product.id && i.type.id === selectedType.id)
    : false;

  const handleAdd = () => {
    if (!selectedType) return;
    add(
      {
        productId: product.id,
        productName: product.name,
        type: { id: selectedType.id, type: selectedType.type, price: selectedType.price },
      },
      qty
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Toast.show({
      type: 'success',
      text1: 'Добавлено в корзину',
      text2: `${product.name} · ${selectedType.type} × ${qty}`,
    });
  };

  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title={product.name}
        floating
        rightAction={
          <IconButton
            icon={<Ionicons name="share-outline" size={20} color={ink.DEFAULT} />}
            tone="inverse"
            size="md"
            accessibilityLabel="Поделиться"
            onPress={() => {}}
          />
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={{ height: HERO_H, width: '100%' }}>
          <ProductPlaceholder
            name={product.name}
            alias={product.alias ?? undefined}
            size="detail"
            className="h-full w-full"
          />
        </View>

        <View className="px-5 pt-6">
          <Text
            className="text-ink"
            style={{ fontFamily: 'SourceSerifPro_700Bold', fontSize: 28, lineHeight: 32 }}
          >
            {product.name}
          </Text>

          <RatingSummary rating={productReviews.data?.rating ?? product.rating} />

          {selectedType ? (
            <Animated.View entering={FadeIn.duration(200)} className="mt-2 flex-row items-baseline gap-3">
              <Text
                className="text-greenman-8"
                style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 28, lineHeight: 32 }}
              >
                {formatPrice(totalPrice, currency)}
              </Text>
              {qty > 1 ? (
                <Text className="text-[14px] text-ink/50" tracking="tight">
                  {formatPrice(selectedType.price, currency)} × {qty}
                </Text>
              ) : null}
            </Animated.View>
          ) : (
            <Text className="mt-2 text-ink/50" tracking="tight">
              Нет в наличии
            </Text>
          )}

          {diseases.length ? (
            <View className="mt-4 flex-row flex-wrap gap-2">
              {diseases.map((d, idx) => (
                <Chip key={idx} label={d} size="sm" tone="primary" />
              ))}
            </View>
          ) : null}

          {hasMultiple ? (
            <View className="mt-6">
              <Text variant="meta-upper" tracking="widest" className="mb-3 text-ink/50">
                Фасовка
              </Text>
              <View className="gap-2">
                {types.map((t) => {
                  const selected = selectedType?.id === t.id;
                  return (
                    <AnimatedPressable
                      key={t.id}
                      onPress={() => setSelectedTypeId(t.id)}
                      haptic="selection"
                      wrapperStyle={selected ? shadows.flat : undefined}
                    >
                      <View
                        className={`flex-row items-center justify-between rounded-xl border-2 px-4 py-3 ${
                          selected
                            ? 'border-greenman-7 bg-greenman-0'
                            : 'border-sand-2 bg-white'
                        }`}
                      >
                        <View className="flex-row items-center gap-3">
                          <View
                            className={`h-5 w-5 items-center justify-center rounded-pill border-2 ${
                              selected ? 'border-greenman-7 bg-greenman-7' : 'border-sand-3'
                            }`}
                          >
                            {selected ? (
                              <Ionicons name="checkmark" size={12} color="#fff" />
                            ) : null}
                          </View>
                          <Text
                            className={`text-[15px] font-semibold ${selected ? 'text-greenman-9' : 'text-ink'}`}
                          >
                            {t.type}
                          </Text>
                        </View>
                        <Text
                          className={`text-[16px] font-bold ${selected ? 'text-greenman-8' : 'text-ink'}`}
                        >
                          {formatPrice(t.price, currency)}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {product.description ? (
            <InfoSection title="Описание" body={product.description} icon="document-text-outline" />
          ) : null}
          {product.applicationMethodAdults ? (
            <InfoSection title="Применение (взрослые)" body={product.applicationMethodAdults} icon="person-outline" />
          ) : null}
          {product.applicationMethodChildren ? (
            <InfoSection title="Применение (дети)" body={product.applicationMethodChildren} icon="happy-outline" />
          ) : null}
          {product.contraindications ? (
            <InfoSection title="Противопоказания" body={product.contraindications} icon="warning-outline" />
          ) : null}

          <ReviewsAccordion
            productId={product.id}
            rating={productReviews.data?.rating ?? product.rating}
            reviews={productReviews.data?.reviews ?? []}
            loading={productReviews.isLoading}
            refetchReviews={() => productReviews.refetch()}
          />

          <View className="mt-6 flex-row items-center gap-3 rounded-xl bg-greenman-0 p-4">
            <View className="h-10 w-10 items-center justify-center rounded-pill bg-greenman-8">
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-bold text-greenman-9" tracking="tight">
                Не уверены — подойдёт ли?
              </Text>
              <Text className="mt-0.5 text-[12px] text-greenman-8/80" tracking="tight">
                Напишите в WhatsApp — подскажем по диагнозу.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 16), ...shadows.float }}
        className="absolute bottom-0 left-0 right-0 bg-white px-5 pt-3"
      >
        <View className="flex-row items-center gap-3">
          <View
            className="h-14 flex-row items-center overflow-hidden rounded-pill bg-sand-1"
            style={{ paddingHorizontal: 4 }}
          >
            <AnimatedPressable
              onPress={() => qty > 1 && setQty((q) => q - 1)}
              disabled={qty <= 1}
              haptic="light"
              scale={0.88}
              className={`h-11 w-11 items-center justify-center rounded-pill ${qty <= 1 ? 'opacity-30' : ''}`}
            >
              <Ionicons name="remove" size={20} color={ink.DEFAULT} />
            </AnimatedPressable>
            <Text className="w-6 text-center text-[17px] font-bold text-ink">{qty}</Text>
            <AnimatedPressable
              onPress={() => setQty((q) => q + 1)}
              haptic="light"
              scale={0.88}
              className="h-11 w-11 items-center justify-center rounded-pill"
            >
              <Ionicons name="add" size={20} color={ink.DEFAULT} />
            </AnimatedPressable>
          </View>

          <AnimatedPressable
            disabled={!selectedType}
            onPress={inCart ? () => router.push('/cart') : handleAdd}
            haptic={inCart ? 'selection' : 'success'}
            wrapperStyle={{ flex: 1, ...(selectedType ? shadows.glow : {}) }}
            className="flex-1"
          >
            <LinearGradient
              colors={selectedType
                ? [greenman[5], greenman[7], greenman[9]]
                : [sand[2], sand[3]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                width: '100%',
                height: 56,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingHorizontal: 16,
              }}
            >
              <Ionicons name={inCart ? 'bag-check-outline' : 'bag-add-outline'} size={20} color="#fff" />
              <Text
                className="flex-1 text-center text-[15px] font-bold text-white"
                tracking="tight"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {inCart
                  ? 'Перейти в корзину'
                  : selectedType
                    ? `В корзину · ${formatPrice(totalPrice, currency)}`
                    : 'Нет в наличии'}
              </Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </View>
    </Screen>
  );
}

function RatingSummary({ rating }: { rating?: ProductRating }) {
  const count = rating?.count ?? 0;
  const average = rating?.average ?? 0;
  return (
    <View className="mt-3 flex-row items-center gap-2">
      <View className="flex-row items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < Math.round(average) ? 'star' : 'star-outline'}
            size={16}
            color={count ? '#d8942b' : sand[4]}
          />
        ))}
      </View>
      <Text className="text-[13px] font-semibold text-ink">
        {count ? average.toFixed(1) : 'Нет оценок'}
      </Text>
      <Text className="text-[12px] text-ink/50">
        {count ? `${count} ${reviewWord(count)}` : 'Будьте первым'}
      </Text>
    </View>
  );
}

function ReviewsAccordion({
  productId,
  rating,
  reviews,
  loading,
  refetchReviews,
}: {
  productId: number;
  rating?: ProductRating;
  reviews: ProductReview[];
  loading: boolean;
  refetchReviews: () => void;
}) {
  const router = useRouter();
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState('');
  const createReview = useCreateProductReview(productId);
  const count = rating?.count ?? reviews.length;
  const average = rating?.average ?? 0;

  const submit = async () => {
    if (!isAuthed) {
      router.push('/auth/phone');
      return;
    }
    try {
      await createReview.mutateAsync({ rating: stars, body: body.trim() || undefined });
      setBody('');
      Toast.show({ type: 'success', text1: 'Отзыв сохранён' });
      refetchReviews();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Не удалось отправить отзыв',
        text2: e?.response?.data?.message ?? 'Попробуйте ещё раз',
      });
    }
  };

  return (
    <View className="mt-3 overflow-hidden rounded-xl border border-sand-2 bg-white" style={shadows.flat}>
      <AnimatedPressable
        onPress={() => setOpen((v) => !v)}
        haptic="selection"
        className="flex-row items-center gap-3 p-4"
      >
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-greenman-0">
          <Ionicons name="star-outline" size={16} color={greenman[8]} />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="meta-upper" tracking="widest" className="text-greenman-8">
            Отзывы
          </Text>
          <Text className="mt-1 text-[12px] text-ink/50">
            {count ? `${average.toFixed(1)} · ${count} ${reviewWord(count)}` : 'Пока нет отзывов'}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={sand[4]} />
      </AnimatedPressable>

      {open ? (
        <View className="border-t border-sand-2 p-4">
          <View className="rounded-lg bg-sand-1 p-3">
            <Text className="text-[13px] font-bold text-ink">Ваша оценка</Text>
            <View className="mt-2 flex-row gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const n = i + 1;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setStars(n)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`${n} из 5`}
                  >
                    <Ionicons
                      name={n <= stars ? 'star' : 'star-outline'}
                      size={28}
                      color="#d8942b"
                    />
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Напишите отзыв"
              placeholderTextColor="#8d958f"
              multiline
              textAlignVertical="top"
              maxLength={2000}
              style={{
                marginTop: 12,
                minHeight: 92,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e4ded1',
                backgroundColor: '#fff',
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontFamily: 'Manrope_400Regular',
                fontSize: 14,
                lineHeight: 20,
                color: ink.DEFAULT,
              }}
            />
            <AnimatedPressable
              onPress={submit}
              disabled={createReview.isPending}
              haptic="medium"
              className="mt-3 h-12 items-center justify-center rounded-lg bg-greenman-8"
            >
              {createReview.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-[14px] font-bold text-white">
                  {isAuthed ? 'Отправить отзыв' : 'Войти и оставить отзыв'}
                </Text>
              )}
            </AnimatedPressable>
          </View>

          <View className="mt-4 gap-3">
            {loading ? (
              <ActivityIndicator color={greenman[8]} />
            ) : reviews.length ? (
              reviews.map((review) => <ReviewItem key={review.id} review={review} />)
            ) : (
              <Text className="py-3 text-center text-[13px] text-ink/50">
                Отзывов пока нет
              </Text>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ReviewItem({ review }: { review: ProductReview }) {
  return (
    <View className="rounded-lg border border-sand-2 bg-white p-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-[13px] font-bold text-ink" numberOfLines={1}>
          {review.author?.name ?? 'Пользователь'}
        </Text>
        <View className="flex-row items-center gap-1">
          <Ionicons name="star" size={14} color="#d8942b" />
          <Text className="text-[12px] font-bold text-ink">{review.rating}</Text>
        </View>
      </View>
      {review.body ? (
        <Text className="mt-2 text-[13px] leading-5 text-ink/75">{review.body}</Text>
      ) : null}
      {review.createdAt ? (
        <Text className="mt-2 text-[11px] text-ink/40">
          {new Date(review.createdAt).toLocaleDateString('ru-RU')}
        </Text>
      ) : null}
    </View>
  );
}

function reviewWord(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'отзыв';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'отзыва';
  return 'отзывов';
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
    <View className="mt-3 rounded-xl border border-sand-2 bg-white p-4" style={shadows.flat}>
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-greenman-0">
            <Ionicons name={icon} size={16} color={greenman[8]} />
          </View>
          <Text variant="meta-upper" tracking="widest" className="flex-1 text-greenman-8">
            {title}
          </Text>
        </View>
          <Text className="mt-3 text-[14px] leading-5 text-ink/80" tracking="tight">
            {body}
          </Text>
      </View>
  );
}
