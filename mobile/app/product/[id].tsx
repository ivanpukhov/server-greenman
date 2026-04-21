import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { View, Pressable, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useMemo, useState } from 'react';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Skeleton } from '@/components/ui/Skeleton';
import { Header } from '@/components/ui/Header';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { ProductPlaceholder } from '@/components/ui/ProductPlaceholder';
import { useProduct } from '@/hooks/useProducts';
import { useCountryStore } from '@/stores/country.store';
import { useCartStore } from '@/stores/cart.store';
import { formatPrice } from '@/lib/format/price';

const { width: screenWidth } = Dimensions.get('window');
const HERO_HEIGHT = screenWidth;

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const currency = useCountryStore((s) => s.currency);
  const add = useCartStore((s) => s.add);
  const router = useRouter();
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
        <View className="px-5">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="mt-6 h-8 w-3/4 rounded" />
          <Skeleton className="mt-3 h-6 w-1/2 rounded" />
          <Skeleton className="mt-5 h-24 w-full rounded" />
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
          <Ionicons name="alert-circle-outline" size={48} color="#5b6360" />
          <Text className="mt-4 text-base font-semibold text-ink">Не удалось загрузить товар</Text>
          <Text className="mt-2 text-center text-sm text-ink-dim">
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
            icon={<Ionicons name="share-outline" size={20} color="#0f1a12" />}
            variant="tonal"
            size="md"
            accessibilityLabel="Поделиться"
            onPress={() => {}}
          />
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}>
        <View style={{ height: HERO_HEIGHT, width: '100%' }}>
          <ProductPlaceholder
            name={product.name}
            alias={product.alias ?? undefined}
            size="detail"
            className="h-full w-full"
          />
        </View>

        <View className="px-5 pt-5">
          <Text className="text-2xl font-display text-ink leading-tight">{product.name}</Text>

          {selectedType ? (
            <View className="mt-2 flex-row items-baseline gap-2">
              <Text className="text-2xl font-display text-greenman-8">
                {formatPrice(totalPrice, currency)}
              </Text>
              {qty > 1 ? (
                <Text className="text-sm text-ink-dim">
                  {formatPrice(selectedType.price, currency)} × {qty}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text className="mt-2 text-base text-ink-dim">Нет в наличии</Text>
          )}

          {diseases.length ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {diseases.map((d, idx) => (
                <Chip key={idx} label={d} size="sm" />
              ))}
            </View>
          ) : null}

          {hasMultiple ? (
            <View className="mt-5">
              <Text className="text-xs font-semibold uppercase tracking-wide text-ink-dim">
                Фасовка
              </Text>
              <View className="mt-2 gap-2">
                {types.map((t) => {
                  const selected = selectedType?.id === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setSelectedTypeId(t.id)}
                      className={`flex-row items-center justify-between rounded-xl border p-3 ${
                        selected
                          ? 'border-greenman-7 bg-greenman-0'
                          : 'border-border bg-white'
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <View
                          className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                            selected ? 'border-greenman-7 bg-greenman-7' : 'border-border'
                          }`}
                        >
                          {selected ? (
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          ) : null}
                        </View>
                        <Text className="text-base text-ink">{t.type}</Text>
                      </View>
                      <Text
                        className={`text-base font-bold ${
                          selected ? 'text-greenman-8' : 'text-ink'
                        }`}
                      >
                        {formatPrice(t.price, currency)}
                      </Text>
                    </Pressable>
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

          <Card variant="tonal" className="mt-5">
            <View className="flex-row gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-greenman-7">
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink">
                  Не уверены — подойдёт ли?
                </Text>
                <Text className="mt-0.5 text-xs text-ink-dim">
                  Напишите в WhatsApp — подскажем по диагнозу.
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-5 pt-3"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-12 flex-row items-center rounded-full bg-greenman-0 px-1">
            <Pressable
              onPress={() => qty > 1 && setQty((q) => q - 1)}
              disabled={qty <= 1}
              className={`h-10 w-10 items-center justify-center rounded-full ${qty <= 1 ? 'opacity-40' : 'active:bg-greenman-1'}`}
              accessibilityLabel="Уменьшить"
            >
              <Ionicons name="remove" size={18} color="#006e30" />
            </Pressable>
            <Text className="w-6 text-center text-base font-semibold text-ink">{qty}</Text>
            <Pressable
              onPress={() => setQty((q) => q + 1)}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-greenman-1"
              accessibilityLabel="Увеличить"
            >
              <Ionicons name="add" size={18} color="#006e30" />
            </Pressable>
          </View>

          <Pressable
            disabled={!selectedType}
            onPress={handleAdd}
            className={`h-12 flex-1 flex-row items-center justify-center rounded-full active:opacity-90 ${!selectedType ? 'bg-greenman-2' : 'bg-greenman-7'}`}
          >
            <Ionicons name="bag-add-outline" size={18} color="#fff" />
            <Text className="ml-2 text-base font-bold text-white">
              В корзину{selectedType ? ` · ${formatPrice(totalPrice, currency)}` : ''}
            </Text>
          </Pressable>
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
    <Pressable
      onPress={() => setOpen((v) => !v)}
      className="mt-3 rounded-xl border border-border bg-white p-3 active:opacity-90"
    >
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-xs font-bold uppercase tracking-wide text-greenman-8">
          {title}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#007d38"
        />
      </View>
      {open ? (
        <Text className="mt-2 text-sm leading-5 text-ink">{body}</Text>
      ) : null}
    </Pressable>
  );
}
