import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { Skeleton } from '@/components/ui/Skeleton';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useMyOrders } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/format/price';
import { greenman, sand, sun, clay, ink } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import type { Currency, Order } from '@/lib/api/types';

type StatusFilter = 'all' | 'processing' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'processing', label: 'В обработке' },
  { key: 'paid', label: 'Оплачено' },
  { key: 'shipped', label: 'Отправлено' },
  { key: 'delivered', label: 'Доставлено' },
  { key: 'cancelled', label: 'Отменено' },
];

export default function OrderListScreen() {
  const orders = useMyOrders();
  const data = orders.data ?? [];
  const [filter, setFilter] = useState<StatusFilter>('all');

  const counts = useMemo(() => {
    const map = new Map<StatusFilter, number>(FILTERS.map((item) => [item.key, 0]));
    map.set('all', data.length);
    for (const order of data) {
      const key = statusKey(order.status);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [data]);

  const filtered = useMemo(
    () => (filter === 'all' ? data : data.filter((order) => statusKey(order.status) === filter)),
    [data, filter],
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Мои заказы' }} />
      <Header title="Мои заказы" />

      <View className="border-b border-border bg-background">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        >
          {FILTERS.map((item) => (
            <Chip
              key={item.key}
              label={`${item.label}${counts.get(item.key) ? ` · ${counts.get(item.key)}` : ''}`}
              selected={filter === item.key}
              tone="primary"
              onPress={() => setFilter(item.key)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={orders.isRefetching}
            onRefresh={() => orders.refetch()}
            tintColor={greenman[8]}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {orders.isLoading ? (
          <View className="gap-3">
            {[0, 1, 2].map((i) => (
              <View key={i} className="rounded-lg bg-white p-4">
                <Skeleton className="h-5 w-1/2 rounded" />
                <Skeleton className="mt-4 h-8 w-2/3 rounded" />
                <Skeleton className="mt-3 h-4 w-full rounded" />
              </View>
            ))}
          </View>
        ) : orders.isError ? (
          <View className="items-center rounded-lg bg-sand-1 px-6 py-12">
            <Ionicons name="cloud-offline-outline" size={40} color={sand[4]} />
            <Text className="mt-3 text-center text-[15px] text-ink/60">Не удалось загрузить заказы</Text>
            <Button label="Повторить" className="mt-5" onPress={() => orders.refetch()} />
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center rounded-lg border border-dashed border-sand-3 px-6 py-12">
            <Ionicons name="cube-outline" size={44} color={sand[4]} />
            <Text className="mt-4 font-display text-[22px] leading-[28px] text-ink">
              Заказов пока нет
            </Text>
            <Text className="mt-2 text-center text-[15px] leading-[22px] text-ink/60">
              Соберите первую корзину из каталога Greenman.
            </Text>
            <Button label="В каталог" className="mt-5" onPress={() => router.push('/catalog')} />
          </View>
        ) : (
          <View className="gap-3">
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function OrderCard({ order }: { order: Order }) {
  const tone = statusTone(order.status);
  const currency = (order.currency as Currency) ?? 'KZT';
  const products = order.products ?? [];
  const track = order.cdekTrackingNumber || order.trackingNumber;

  return (
    <AnimatedPressable
      onPress={() => router.push(`/order/${order.id}`)}
      haptic="selection"
      scale={0.98}
      wrapperStyle={shadows.soft}
      className="rounded-lg bg-white p-4"
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-greenman-0">
            <Ionicons name="cube-outline" size={18} color={greenman[7]} />
          </View>
          <View>
            <Text className="text-[13px] font-semibold text-ink">№{order.id}</Text>
            {order.createdAt ? (
              <Text className="text-[11px] text-ink/50">
                {new Date(order.createdAt).toLocaleDateString('ru-RU')}
              </Text>
            ) : null}
          </View>
        </View>
        <View className={`flex-row items-center rounded-pill ${tone.bg} px-3 py-1.5`}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone.dot, marginRight: 6 }} />
          <Text className={`text-[11px] font-bold ${tone.text}`} numberOfLines={1}>
            {order.status}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center">
        {products.slice(0, 4).map((line, index) => (
          <View
            key={`${line.productId}-${line.typeId}-${index}`}
            className="h-12 w-12 items-center justify-center rounded-md border-2 border-white bg-sand-1"
            style={{ marginLeft: index ? -10 : 0 }}
          >
            <Ionicons name="leaf-outline" size={18} color={greenman[7]} />
          </View>
        ))}
        {products.length > 4 ? (
          <View className="h-12 min-w-12 items-center justify-center rounded-md border-2 border-white bg-ink px-2" style={{ marginLeft: -10 }}>
            <Text className="text-[11px] font-bold text-white">+{products.length - 4}</Text>
          </View>
        ) : null}
        <View className="ml-3 min-w-0 flex-1">
          <Text className="text-[13px] leading-[18px] text-ink/80" numberOfLines={1}>
            {products.length} товаров · {formatPrice(order.totalPrice, currency)}
          </Text>
          {track ? (
            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="car-outline" size={14} color={greenman[7]} />
              <Text className="text-[11px] font-semibold text-greenman-7" numberOfLines={1}>
                Трекинг {track}
              </Text>
            </View>
          ) : (
            <Text className="mt-1 text-[11px] text-ink/50" numberOfLines={1}>
              {order.city}
              {order.street ? `, ${order.street}` : ''}
            </Text>
          )}
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="font-display text-[17px] leading-[22px] text-ink">
          {formatPrice(order.totalPrice, currency)}
        </Text>
        <Text className="text-[13px] font-semibold text-greenman-7">Подробнее</Text>
      </View>
    </AnimatedPressable>
  );
}

function statusKey(status: string): StatusFilter {
  const s = status.toLowerCase();
  if (s.includes('оплач')) return 'paid';
  if (s.includes('отправ')) return 'shipped';
  if (s.includes('достав')) return 'delivered';
  if (s.includes('отмен')) return 'cancelled';
  return 'processing';
}

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s.includes('отправ')) return { bg: 'bg-sun-1', dot: sun[3], text: 'text-ink' };
  if (s.includes('оплач')) return { bg: 'bg-greenman-1', dot: greenman[7], text: 'text-greenman-9' };
  if (s.includes('достав')) return { bg: 'bg-sand-1', dot: sand[4], text: 'text-ink/70' };
  if (s.includes('отмен')) return { bg: 'bg-sand-1', dot: '#b00', text: 'text-ink/50' };
  return { bg: 'bg-clay-0', dot: clay[4], text: 'text-clay-6' };
}
