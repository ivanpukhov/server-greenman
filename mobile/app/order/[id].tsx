import { useLocalSearchParams, Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Skeleton } from '@/components/ui/Skeleton';
import { useOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/format/price';
import type { Currency } from '@/lib/api/types';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, isError } = useOrder(id);

  return (
    <Screen>
      <Stack.Screen options={{ title: `Заказ #${id}` }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        {isLoading ? (
          <View className="gap-2">
            <Skeleton className="h-6 w-1/3 rounded" />
            <Skeleton className="mt-3 h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </View>
        ) : isError || !order ? (
          <Text className="text-sm text-ink-dim">Не удалось загрузить заказ.</Text>
        ) : (
          <>
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-display text-ink">Заказ #{order.id}</Text>
              <View className="rounded-full bg-greenman-0 px-3 py-1.5">
                <Text className="text-xs font-semibold text-greenman-8">{order.status}</Text>
              </View>
            </View>
            {order.createdAt ? (
              <Text className="mt-1 text-xs text-ink-dim">
                {new Date(order.createdAt).toLocaleString('ru-RU')}
              </Text>
            ) : null}

            <View className="mt-5 rounded-xl bg-greenman-0 p-4">
              <Row label="Доставка" value={labelDelivery(order.deliveryMethod)} />
              <Row label="Оплата" value={labelPayment(order.paymentMethod)} />
              <Row
                label="Сумма"
                value={formatPrice(order.totalPrice, (order.currency as Currency) ?? 'KZT')}
                big
              />
            </View>

            <View className="mt-6">
              <Text className="text-lg font-bold text-ink">Получатель</Text>
              <View className="mt-2 rounded-xl border border-border bg-white p-4">
                <Text className="text-base font-semibold text-ink">{order.customerName}</Text>
                {order.phoneNumber ? (
                  <Text className="mt-1 text-sm text-ink-dim">+{order.phoneNumber}</Text>
                ) : null}
                {order.email ? (
                  <Text className="mt-1 text-sm text-ink-dim">{order.email}</Text>
                ) : null}
                <Text className="mt-2 text-sm text-ink-dim">
                  {order.city}
                  {order.street ? `, ${order.street}` : ''}
                  {order.houseNumber ? `, ${order.houseNumber}` : ''}
                </Text>
                {order.addressIndex ? (
                  <Text className="mt-1 text-xs text-ink-dim">Индекс {order.addressIndex}</Text>
                ) : null}
                {order.cdekPvzCode ? (
                  <Text className="mt-2 text-xs text-ink-dim">
                    ПВЗ {order.cdekPvzCode}
                    {order.cdekAddress ? ` — ${order.cdekAddress}` : ''}
                  </Text>
                ) : null}
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-lg font-bold text-ink">Состав</Text>
              <View className="mt-2 gap-2">
                {(order.products ?? []).map((line, idx) => (
                  <View
                    key={`${line.productId}-${line.typeId}-${idx}`}
                    className="rounded-xl border border-border bg-white p-4"
                  >
                    <Text className="text-sm font-semibold text-ink">{line.productName}</Text>
                    <Text className="mt-1 text-xs text-ink-dim">{line.type}</Text>
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-xs text-ink-dim">× {line.quantity}</Text>
                      <Text className="text-sm font-bold text-greenman-8">
                        {formatPrice(
                          line.price * line.quantity,
                          (order.currency as Currency) ?? 'KZT'
                        )}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {order.trackingNumber || order.cdekTrackingNumber ? (
              <View className="mt-6 rounded-xl border border-greenman-2 bg-greenman-0 p-4">
                <Text className="text-sm font-semibold text-greenman-8">Трек-номер</Text>
                <Text className="mt-1 text-base font-bold text-ink">
                  {order.cdekTrackingNumber || order.trackingNumber}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View className="mt-1 flex-row items-center justify-between">
      <Text className="text-sm text-ink-dim">{label}</Text>
      <Text className={big ? 'text-lg font-display text-ink' : 'text-sm font-semibold text-ink'}>
        {value}
      </Text>
    </View>
  );
}

function labelDelivery(m: string) {
  switch (m) {
    case 'kazpost':
      return 'Казпочта';
    case 'indrive':
      return 'inDrive';
    case 'city':
      return 'Курьер';
    case 'cdek':
      return 'СДЭК';
    default:
      return m || '—';
  }
}

function labelPayment(m: string) {
  switch (m) {
    case 'kaspi':
      return 'Kaspi';
    case 'money':
      return 'Наличные';
    case 'cod':
      return 'Наложенный платёж';
    default:
      return m || '—';
  }
}
