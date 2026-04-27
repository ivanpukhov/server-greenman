import { useLocalSearchParams, Stack } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Skeleton } from '@/components/ui/Skeleton';
import { Header } from '@/components/ui/Header';
import { StickyCTA } from '@/components/ui/StickyCTA';
import { Button } from '@/components/ui/Button';
import { OrderTracker } from '@/components/order/OrderTracker';
import { useOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/format/price';
import { shadows } from '@/theme/shadows';
import type { Currency } from '@/lib/api/types';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, isError } = useOrder(id);

  return (
    <Screen>
      <Stack.Screen options={{ title: `Заказ #${id}` }} />
      <Header title={`Заказ #${id}`} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 132 }}>
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
            <View>
              <Text variant="meta-upper" className="text-ink/50" tracking="wide">
                Заказ от {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : '—'}
              </Text>
              <View className="mt-2 flex-row items-center justify-between gap-3">
                <Text className="font-display text-[28px] leading-[34px] text-ink">№{order.id}</Text>
                <View className="rounded-pill bg-greenman-0 px-4 py-2">
                  <Text className="text-[13px] font-semibold text-greenman-8">{order.status}</Text>
                </View>
              </View>
            </View>

            <View className="mt-5">
              <OrderTracker status={order.status} />
            </View>

            {(order.trackingNumber || order.cdekTrackingNumber) ? (
              <View className="mt-4 rounded-md bg-sand-1 p-4">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="barcode-outline" size={18} color="#007d38" />
                  <Text className="text-[11px] font-semibold uppercase text-ink/50">Трек-номер</Text>
                </View>
                <Text className="mt-1 text-[15px] font-semibold text-ink">
                  {order.cdekTrackingNumber || order.trackingNumber}
                </Text>
              </View>
            ) : null}

            <View className="mt-5 rounded-md bg-greenman-0 p-4">
              <Row label="Доставка" value={labelDelivery(order.deliveryMethod)} />
              <Row label="Оплата" value={labelPayment(order.paymentMethod)} />
              <Row
                label="Сумма"
                value={formatPrice(order.totalPrice, (order.currency as Currency) ?? 'KZT')}
                big
              />
            </View>

            <View className="mt-6">
              <Text className="font-display text-[22px] leading-[28px] text-ink">Получатель</Text>
              <View className="mt-2 rounded-md border border-border bg-white p-4" style={shadows.flat}>
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
              <Text className="font-display text-[22px] leading-[28px] text-ink">
                Состав заказа · {(order.products ?? []).length} товаров
              </Text>
              <View className="mt-2 gap-2">
                {(order.products ?? []).map((line, idx) => (
                  <View
                    key={`${line.productId}-${line.typeId}-${idx}`}
                    className="flex-row items-center rounded-md border border-border bg-white p-3"
                    style={shadows.flat}
                  >
                    <View className="h-14 w-14 items-center justify-center rounded-md bg-sand-1">
                      <Ionicons name="leaf-outline" size={22} color="#007d38" />
                    </View>
                    <View className="ml-3 min-w-0 flex-1">
                      <Text className="text-sm font-semibold text-ink" numberOfLines={2}>{line.productName}</Text>
                      <Text className="mt-1 text-xs text-ink-dim">{line.type} · × {line.quantity}</Text>
                    </View>
                      <Text className="text-sm font-bold text-greenman-8">
                        {formatPrice(
                          line.price * line.quantity,
                          (order.currency as Currency) ?? 'KZT'
                        )}
                      </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      {order ? (
        <StickyCTA>
          <Button
            label={String(order.status).toLowerCase().includes('достав') ? 'Повторить заказ' : 'Связаться с менеджером'}
            size="lg"
            full
            variant={String(order.status).toLowerCase().includes('достав') ? 'primary' : 'tonal'}
            iconRight={<Ionicons name="logo-whatsapp" size={18} color={String(order.status).toLowerCase().includes('достав') ? '#fff' : '#00622a'} />}
            onPress={() => Linking.openURL('https://wa.me/77001234567').catch(() => {})}
          />
        </StickyCTA>
      ) : null}
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
