import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/stores/cart.store';
import { useCreateOrder } from '@/hooks/useOrders';
import { useCdekCities, useCdekPvz, useCdekCalculate } from '@/hooks/useCdek';
import { checkoutRfSchema, type CheckoutRfValues } from '@/lib/validation/schemas';
import { formatRfPhoneInput, toServerPhoneRf } from '@/lib/format/phoneRf';
import type { CdekCity, CdekPvz, CdekDeliveryMode } from '@/lib/api/types';
import { PvzPickerSheet } from './PvzPickerSheet';

const formatRub = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;

export function CheckoutRf() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const subtotalKzt = useCartStore((s) => s.subtotal());

  const pvzSheet = useRef<BottomSheetModal>(null);

  const [cityQuery, setCityQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<CdekCity | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<CdekDeliveryMode>('door');
  const [address, setAddress] = useState('');
  const [selectedPvz, setSelectedPvz] = useState<CdekPvz | null>(null);

  const { data: citySuggestions } = useCdekCities(cityQuery);
  const { data: pvzPoints, isLoading: pvzLoading, error: pvzError } = useCdekPvz(
    deliveryMode === 'pvz' ? selectedCity?.code ?? null : null
  );

  const products = useMemo(
    () =>
      items.map((it) => ({
        productTypeId: it.type.id,
        quantity: it.quantity,
      })),
    [items]
  );

  const {
    data: calc,
    isFetching: calcFetching,
    error: calcError,
  } = useCdekCalculate({
    cityCode: selectedCity?.code ?? null,
    toAddress: deliveryMode === 'door' ? address : undefined,
    deliveryMode,
    products,
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CheckoutRfValues>({
    resolver: zodResolver(checkoutRfSchema),
    mode: 'onChange',
    defaultValues: { customerName: '', email: '', phoneNumber: '' },
  });

  const { mutateAsync: createOrder, isPending } = useCreateOrder();

  const deliveryRub = calc?.delivery_sum ?? 0;
  const grandTotalRub = (calc?.total_sum ?? 0) + deliveryRub || deliveryRub;

  const pickCity = (c: CdekCity) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedCity(c);
    setCityQuery(c.full_name || c.city);
    setSelectedPvz(null);
  };

  const pickPvz = (p: CdekPvz) => {
    setSelectedPvz(p);
    pvzSheet.current?.dismiss();
  };

  const hasDeliveryTarget = deliveryMode === 'pvz' ? !!selectedPvz : address.trim().length > 0;
  const canSubmit =
    isValid &&
    !!selectedCity &&
    hasDeliveryTarget &&
    !!calc &&
    !calcFetching &&
    !calcError &&
    items.length > 0;

  const onSubmit = async (values: CheckoutRfValues) => {
    if (!canSubmit || !selectedCity || !calc) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const payload: Record<string, unknown> = {
        customerName: values.customerName,
        email: values.email,
        phoneNumber: toServerPhoneRf(values.phoneNumber),
        country: 'RF',
        deliveryMethod: 'cdek',
        paymentMethod: 'cod',
        products: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          typeId: it.type.id,
        })),
        totalPrice: grandTotalRub || (calc.total_sum ?? 0) + deliveryRub,
        cdekDeliveryMode: deliveryMode,
        cdekCityCode: selectedCity.code,
        cdekCityLabel: selectedCity.full_name || selectedCity.city,
        cdekAddress: deliveryMode === 'door' ? address : null,
        cdekPvzCode: deliveryMode === 'pvz' ? selectedPvz?.code : null,
        cdekPvzName: deliveryMode === 'pvz' ? selectedPvz?.name : null,
        cdekPvzAddress:
          deliveryMode === 'pvz' ? selectedPvz?.full_address || selectedPvz?.address : null,
        cdekCalcPriceRub: deliveryRub,
      };
      const order = await createOrder(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      clearCart();
      Toast.show({
        type: 'success',
        text1: 'Заказ принят',
        text2: deliveryMode === 'pvz' ? 'Заберите в выбранном ПВЗ' : 'Курьер СДЭК свяжется с вами',
      });
      if (order?.id) router.replace(`/order/${order.id}`);
      else router.replace('/(tabs)/profile');
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Toast.show({ type: 'error', text1: 'Не удалось оформить заказ' });
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-2xl font-display text-ink">Оформление заказа</Text>
        <Text className="mt-1 text-sm text-ink-dim">Россия · СДЭК · наложенный платёж</Text>

        <View className="mt-6 gap-3">
          <Controller
            control={control}
            name="customerName"
            render={({ field }) => (
              <Input
                variant="floating"
                label="ФИО"
                placeholder="Фамилия Имя Отчество"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.customerName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                variant="floating"
                label="Email"
                placeholder="name@example.ru"
                keyboardType="email-address"
                autoCapitalize="none"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field }) => (
              <Input
                variant="floating"
                label="Телефон"
                placeholder="+7 000 000-00-00"
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={(t) => field.onChange(formatRfPhoneInput(t))}
                error={errors.phoneNumber?.message}
              />
            )}
          />
        </View>

        <View className="mt-8">
          <Text className="text-lg font-bold text-ink">Способ доставки</Text>
          <View className="mt-3 flex-row gap-2">
            <ModeChip
              active={deliveryMode === 'door'}
              onPress={() => setDeliveryMode('door')}
              title="Дверь-дверь"
            />
            <ModeChip
              active={deliveryMode === 'pvz'}
              onPress={() => setDeliveryMode('pvz')}
              title="В ПВЗ"
            />
          </View>
        </View>

        <View className="mt-6">
          <Text className="mb-2 text-sm font-semibold text-ink">Город доставки</Text>
          <Input
            placeholder="Начните вводить"
            value={cityQuery}
            onChangeText={(v) => {
              setCityQuery(v);
              setSelectedCity(null);
              setSelectedPvz(null);
            }}
            autoCorrect={false}
          />
          {!selectedCity && citySuggestions && citySuggestions.length > 0 ? (
            <View className="mt-2 rounded-xl border border-border bg-white">
              {citySuggestions.slice(0, 8).map((c, idx) => (
                <Pressable
                  key={`${c.code}-${c.full_name ?? c.city}`}
                  onPress={() => pickCity(c)}
                  className={`px-4 py-3 ${idx === citySuggestions.length - 1 ? '' : 'border-b border-border'} active:bg-greenman-0`}
                >
                  <Text className="text-sm text-ink">{c.full_name || c.city}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {deliveryMode === 'door' ? (
          <View className="mt-6">
            <Input
              variant="floating"
              label="Адрес"
              placeholder="ул. Тверская, д. 1, кв. 10"
              value={address}
              onChangeText={setAddress}
            />
          </View>
        ) : (
          <View className="mt-6">
            <Text className="mb-2 text-sm font-semibold text-ink">Пункт выдачи</Text>
            {!selectedCity ? (
              <Text className="text-sm text-ink-dim">Сначала выберите город.</Text>
            ) : pvzLoading ? (
              <View className="flex-row items-center gap-2 rounded-xl border border-border bg-white p-4">
                <ActivityIndicator color="#0e9a47" />
                <Text className="text-sm text-ink-dim">Загрузка ПВЗ...</Text>
              </View>
            ) : pvzError ? (
              <Text className="text-sm text-red-500">Не удалось загрузить ПВЗ.</Text>
            ) : (
              <Pressable
                onPress={() => pvzSheet.current?.present()}
                className="rounded-xl border border-border bg-white p-4 active:bg-greenman-0"
              >
                {selectedPvz ? (
                  <>
                    <Text className="text-base font-semibold text-ink">{selectedPvz.name}</Text>
                    <Text className="mt-1 text-sm text-ink-dim">
                      {selectedPvz.full_address || selectedPvz.address}
                    </Text>
                    {selectedPvz.work_time ? (
                      <Text className="mt-1 text-xs text-ink-dim">График: {selectedPvz.work_time}</Text>
                    ) : null}
                    <Text className="mt-2 text-xs font-semibold text-greenman-7">Сменить</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-base font-semibold text-ink">Выбрать ПВЗ</Text>
                    <Text className="mt-1 text-xs text-ink-dim">
                      Доступно: {pvzPoints?.length ?? 0}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}

        <View className="mt-8 rounded-xl bg-greenman-0 p-5">
          <Row label="Товары (KZT)" value={`${subtotalKzt.toLocaleString('ru-RU')} ₸`} />
          <Row
            label="Доставка"
            value={
              calcFetching
                ? 'Расчёт...'
                : calcError
                ? 'Ошибка расчёта'
                : calc
                ? formatRub(deliveryRub)
                : '—'
            }
          />
          {calc?.period_min && calc.period_max ? (
            <Text className="mt-1 text-xs text-ink-dim">
              Срок: {calc.period_min}–{calc.period_max} дн.
            </Text>
          ) : null}
          <View className="my-3 h-px bg-greenman-2" />
          <Row
            label="Итого"
            big
            value={
              calc ? formatRub((calc.total_sum ?? 0) + deliveryRub) : formatRub(deliveryRub)
            }
          />
        </View>

        <Text className="mt-4 text-xs text-ink-dim">
          {deliveryMode === 'pvz'
            ? 'Оплата наличными при получении в ПВЗ.'
            : 'Оплата наличными курьеру при получении.'}
        </Text>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-5 pb-8 pt-3">
        <Button
          label={isPending ? 'Отправка...' : 'Оформить заказ'}
          size="lg"
          disabled={!canSubmit}
          loading={isPending}
          onPress={handleSubmit(onSubmit)}
        />
      </View>

      <PvzPickerSheet ref={pvzSheet} points={pvzPoints ?? []} onPick={pickPvz} />
    </>
  );
}

function ModeChip({
  active,
  onPress,
  title,
}: {
  active: boolean;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      className={`flex-1 rounded-xl border p-4 active:opacity-80 ${active ? 'border-greenman-6 bg-greenman-0' : 'border-border bg-white'}`}
    >
      <Text className={`text-center text-base font-semibold ${active ? 'text-greenman-8' : 'text-ink'}`}>
        {title}
      </Text>
    </Pressable>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={`${big ? 'text-base font-bold' : 'text-sm'} text-ink-dim`}>{label}</Text>
      <Text className={`${big ? 'text-xl font-display text-ink' : 'text-sm font-semibold text-ink'}`}>
        {value}
      </Text>
    </View>
  );
}
