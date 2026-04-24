import { useLocalSearchParams, Stack } from 'expo-router';
import { View, ScrollView, Dimensions } from 'react-native';
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
import { useProduct } from '@/hooks/useProducts';
import { useCountryStore } from '@/stores/country.store';
import { useCartStore } from '@/stores/cart.store';
import { formatPrice } from '@/lib/format/price';
import { greenman, ink, sand, clay } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

cssInterop(LinearGradient, { className: 'style' });

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = SCREEN_W;

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const currency = useCountryStore((s) => s.currency);
  const add = useCartStore((s) => s.add);
  const { data: product, isLoading, isError } = useProduct(id);

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
            <InfoSection title="Описание" body={product.description} defaultOpen />
          ) : null}
          {product.applicationMethodAdults ? (
            <InfoSection title="Применение (взрослые)" body={product.applicationMethodAdults} />
          ) : null}
          {product.applicationMethodChildren ? (
            <InfoSection title="Применение (дети)" body={product.applicationMethodChildren} />
          ) : null}
          {product.contraindications ? (
            <InfoSection title="Противопоказания" body={product.contraindications} />
          ) : null}

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
            onPress={handleAdd}
            haptic="success"
            wrapperStyle={{ flex: 1, ...(selectedType ? shadows.glow : {}) }}
          >
            <LinearGradient
              colors={selectedType
                ? [greenman[5], greenman[7], greenman[9]]
                : [sand[2], sand[3]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: 56,
                borderRadius: 999,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="bag-add-outline" size={20} color="#fff" />
              <Text className="text-[16px] font-bold text-white" tracking="tight">
                В корзину{selectedType ? ` · ${formatPrice(totalPrice, currency)}` : ''}
              </Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </View>
    </Screen>
  );
}

function InfoSection({
  title,
  body,
  defaultOpen,
}: {
  title: string;
  body: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <AnimatedPressable
      onPress={() => setOpen((v) => !v)}
      haptic="selection"
      scale={0.99}
      wrapperStyle={{ marginTop: 12 }}
    >
      <View className="rounded-xl border border-sand-2 bg-white p-4">
        <View className="flex-row items-center justify-between">
          <Text variant="meta-upper" tracking="widest" className="flex-1 text-greenman-8">
            {title}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={sand[4]}
          />
        </View>
        {open ? (
          <Text className="mt-3 text-[14px] leading-5 text-ink/80" tracking="tight">
            {body}
          </Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}
