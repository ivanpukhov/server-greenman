import { ScrollView, View, RefreshControl } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { Skeleton } from '@/components/ui/Skeleton';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useMyOrders } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/format/price';
import { greenman, sand, sun, clay } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import type { Currency, Order } from '@/lib/api/types';

export default function OrderListScreen() {
  const orders = useMyOrders();
  const data = orders.data ?? [];

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Мои заказы' }} />
      <Header title="Мои заказы" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={orders.isRefetching}
            onRefresh={() => orders.refetch()}
            tintColor={greenman[8]}
          />
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      >
        {orders.isLoading ? (
          <View className="gap-3">
            {[0, 1, 2].map((i) => (
              <View key={i} className="rounded-xl bg-white p-4">
                <Skeleton className="h-5 w-1/2 rounded" />
                <Skeleton className="mt-4 h-8 w-2/3 rounded" />
                <Skeleton className="mt-3 h-4 w-full rounded" />
              </View>
            ))}
          </View>
        ) : orders.isError ? (
          <View className="items-center rounded-xl bg-sand-1 px-6 py-12">
            <Ionicons name="cloud-offline-outline" size={36} color={sand[4]} />
            <Text className="mt-3 text-center text-ink/60">Не удалось загрузить заказы</Text>
          </View>
        ) : data.length === 0 ? (
          <View className="items-center rounded-xl border border-dashed border-sand-3 px-6 py-12">
            <Ionicons name="cube-outline" size={36} color={sand[4]} />
            <Text className="mt-3 text-center text-ink/60">Заказов пока нет</Text>
          </View>
        ) : (
          <View className="gap-3">
            {data.map((order) => (
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

  return (
    <AnimatedPressable
      onPress={() => router.push(`/order/${order.id}`)}
      haptic="selection"
      scale={0.98}
      wrapperStyle={shadows.flat}
    >
      <View className="rounded-xl bg-white p-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className={`flex-row items-center rounded-pill ${tone.bg} px-3 py-1`}>
            <View
              style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone.dot, marginRight: 6 }}
            />
            <Text className={`text-[11px] font-bold ${tone.text}`} tracking="wide" numberOfLines={1}>
              {order.status}
            </Text>
          </View>
          <Text variant="meta-upper" tracking="widest" className="text-ink/40">
            #{order.id}
          </Text>
        </View>

        <Text className="mt-4 font-display text-[26px] leading-[30px] text-ink">
          {formatPrice(order.totalPrice, currency)}
        </Text>

        <View className="mt-3 flex-row items-center">
          <Ionicons name="location-outline" size={14} color={sand[4]} />
          <Text className="ml-1 flex-1 text-[12px] text-ink/60" numberOfLines={1} tracking="tight">
            {order.city}
            {order.street ? `, ${order.street}` : ''}
          </Text>
        </View>

        {order.createdAt ? (
          <Text className="mt-2 text-[11px] text-ink/40">
            {new Date(order.createdAt).toLocaleString('ru-RU')}
          </Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s.includes('отправ')) return { bg: 'bg-sun-1', dot: sun[3], text: 'text-ink' };
  if (s.includes('оплач')) return { bg: 'bg-greenman-1', dot: greenman[7], text: 'text-greenman-9' };
  if (s.includes('достав')) return { bg: 'bg-sand-1', dot: sand[4], text: 'text-ink/70' };
  if (s.includes('отмен')) return { bg: 'bg-sand-1', dot: '#b00', text: 'text-ink/50' };
  return { bg: 'bg-clay-0', dot: clay[4], text: 'text-clay-6' };
}
