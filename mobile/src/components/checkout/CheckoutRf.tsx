import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StickyCTA } from '@/components/ui/StickyCTA';
import { StepHeader } from './StepHeader';
import { greenman, ink } from '@/theme/colors';
import { useCartStore } from '@/stores/cart.store';
import { useCreateOrder } from '@/hooks/useOrders';
import { useCdekCalculate, useCdekCities, useCdekPvz } from '@/hooks/useCdek';
import { checkoutRfSchema, type CheckoutRfValues } from '@/lib/validation/schemas';
import { formatRfPhoneInput, toServerPhoneRf } from '@/lib/format/phoneRf';
import type { CdekCity, CdekDeliveryMode, CdekPvz } from '@/lib/api/types';
import { PvzPickerSheet } from './PvzPickerSheet';

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: 'Получатель и доставка',
  2: 'Оплата',
  3: 'Подтверждение',
};

const formatRub = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;

export function CheckoutRf() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const subtotalKzt = useCartStore((s) => s.subtotal());
  const pvzSheet = useRef<BottomSheetModal>(null);
  const [step, setStep] = useState<Step>(1);
  const [cityQuery, setCityQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<CdekCity | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<CdekDeliveryMode>('door');
  const [address, setAddress] = useState('');
  const [selectedPvz, setSelectedPvz] = useState<CdekPvz | null>(null);

  const { data: citySuggestions } = useCdekCities(cityQuery);
  const { data: pvzPoints, isLoading: pvzLoading, error: pvzError } = useCdekPvz(
    deliveryMode === 'pvz' ? selectedCity?.code ?? null : null,
  );

  const products = useMemo(
    () => items.map((item) => ({ productTypeId: item.type.id, quantity: item.quantity })),
    [items],
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
    watch,
    formState: { errors, isValid },
  } = useForm<CheckoutRfValues>({
    resolver: zodResolver(checkoutRfSchema),
    mode: 'onChange',
    defaultValues: { customerName: '', email: '', phoneNumber: '' },
  });

  const formValues = watch();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const deliveryRub = calc?.delivery_sum ?? 0;
  const totalRub = calc ? (calc.total_sum ?? 0) + deliveryRub : deliveryRub;
  const hasDeliveryTarget = deliveryMode === 'pvz' ? !!selectedPvz : address.trim().length > 0;
  const step1Ready = isValid && !!selectedCity && hasDeliveryTarget && !calcError;
  const canSubmit = step1Ready && !!calc && !calcFetching && items.length > 0;
  const canGoNext = step === 1 ? step1Ready : step === 2 ? true : canSubmit;

  const pickCity = (city: CdekCity) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedCity(city);
    setCityQuery(city.full_name || city.city);
    setSelectedPvz(null);
  };

  const pickPvz = (point: CdekPvz) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedPvz(point);
    pvzSheet.current?.dismiss();
  };

  const onSubmit = async (values: CheckoutRfValues) => {
    if (!canSubmit || !selectedCity || !calc) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const order = await createOrder({
        customerName: values.customerName,
        email: values.email,
        phoneNumber: toServerPhoneRf(values.phoneNumber),
        country: 'RF',
        deliveryMethod: 'cdek',
        paymentMethod: 'cod',
        products: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          typeId: item.type.id,
        })),
        totalPrice: totalRub,
        cdekDeliveryMode: deliveryMode,
        cdekCityCode: selectedCity.code,
        cdekCityLabel: selectedCity.full_name || selectedCity.city,
        cdekAddress: deliveryMode === 'door' ? address : null,
        cdekPvzCode: deliveryMode === 'pvz' ? selectedPvz?.code : null,
        cdekPvzName: deliveryMode === 'pvz' ? selectedPvz?.name : null,
        cdekPvzAddress:
          deliveryMode === 'pvz' ? selectedPvz?.full_address || selectedPvz?.address : null,
        cdekCalcPriceRub: deliveryRub,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      clearCart();
      Toast.show({
        type: 'success',
        text1: 'Заказ принят',
        text2: deliveryMode === 'pvz' ? 'Заберите в выбранном ПВЗ' : 'Курьер СДЭК свяжется с вами',
      });
      router.replace(order?.id ? `/order/${order.id}` : '/(tabs)/profile');
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Toast.show({ type: 'error', text1: 'Не удалось оформить заказ' });
    }
  };

  const primaryPress = () => {
    if (step < 3) {
      setStep((current) => (current + 1) as Step);
      Haptics.selectionAsync().catch(() => {});
      return;
    }
    handleSubmit(onSubmit)();
  };

  return (
    <View className="flex-1">
      <StepHeader
        step={step}
        title={STEP_TITLES[step]}
        onBack={step > 1 ? () => setStep((current) => (current - 1) as Step) : undefined}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 132 }}
      >
        {step === 1 ? (
          <View className="gap-4">
            <Card variant="flat" radius="lg" padded="sm">
              <Text variant="meta-upper" className="mb-3 text-ink/50" tracking="wide">
                Получатель
              </Text>
              <View className="gap-3">
                <Controller
                  control={control}
                  name="customerName"
                  render={({ field }) => (
                    <Input label="ФИО" value={field.value} onChangeText={field.onChange} error={errors.customerName?.message} />
                  )}
                />
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={errors.email?.message} />
                  )}
                />
                <Controller
                  control={control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <Input label="Телефон" keyboardType="phone-pad" value={field.value} onChangeText={(text) => field.onChange(formatRfPhoneInput(text))} error={errors.phoneNumber?.message} />
                  )}
                />
              </View>
            </Card>

            <Card variant="flat" radius="lg" padded="sm">
              <Text variant="meta-upper" className="mb-3 text-ink/50" tracking="wide">
                СДЭК
              </Text>
              <View className="mb-3 flex-row gap-2">
                <ModeChip
                  active={deliveryMode === 'door'}
                  icon="home-outline"
                  title="До двери"
                  onPress={() => setDeliveryMode('door')}
                />
                <ModeChip
                  active={deliveryMode === 'pvz'}
                  icon="cube-outline"
                  title="ПВЗ"
                  onPress={() => setDeliveryMode('pvz')}
                />
              </View>

              <Input
                label="Город"
                value={cityQuery}
                placeholder="Начните вводить"
                onChangeText={(value) => {
                  setCityQuery(value);
                  setSelectedCity(null);
                  setSelectedPvz(null);
                }}
                leftIcon={<Ionicons name="location-outline" size={18} color={greenman[7]} />}
              />
              {!selectedCity && citySuggestions?.length ? (
                <View className="mt-2 rounded-md border border-border bg-white">
                  {citySuggestions.slice(0, 6).map((city, index) => (
                    <Pressable
                      key={`${city.code}-${city.full_name ?? city.city}`}
                      onPress={() => pickCity(city)}
                      className={`px-4 py-3 ${index === citySuggestions.length - 1 ? '' : 'border-b border-border'}`}
                    >
                      <Text className="text-[13px] font-semibold text-ink">
                        {city.full_name || city.city}
                      </Text>
                      {city.region ? <Text className="text-[11px] text-ink/60">{city.region}</Text> : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {deliveryMode === 'door' ? (
                <Input
                  containerClassName="mt-3"
                  label="Адрес"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="ул. Тверская, д. 1, кв. 10"
                />
              ) : (
                <View className="mt-3">
                  {!selectedCity ? (
                    <Text className="text-[13px] text-ink/60">Сначала выберите город.</Text>
                  ) : pvzLoading ? (
                    <View className="flex-row items-center gap-2 rounded-md bg-sand-1 p-4">
                      <ActivityIndicator color={greenman[7]} />
                      <Text className="text-[13px] text-ink/60">Загрузка ПВЗ...</Text>
                    </View>
                  ) : pvzError ? (
                    <Text className="text-[13px] text-danger">Не удалось загрузить ПВЗ.</Text>
                  ) : (
                    <Pressable
                      onPress={() => pvzSheet.current?.present()}
                      className="min-h-20 rounded-md border border-ink/10 bg-white p-4"
                    >
                      <Text className="text-[15px] font-semibold text-ink">
                        {selectedPvz ? selectedPvz.name : 'Выбрать ПВЗ'}
                      </Text>
                      <Text className="mt-1 text-[11px] leading-[14px] text-ink/60">
                        {selectedPvz
                          ? selectedPvz.full_address || selectedPvz.address
                          : `Доступно: ${pvzPoints?.length ?? 0}`}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Card>
          </View>
        ) : null}

        {step === 2 ? (
          <Card variant="flat" radius="lg" padded="sm">
            <Text variant="meta-upper" className="mb-3 text-ink/50" tracking="wide">
              Оплата
            </Text>
            <View className="min-h-20 flex-row items-center rounded-md border border-greenman-7 bg-greenman-0 p-4">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-greenman-7">
                <Ionicons name="cash-outline" size={19} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-ink">Оплата при получении</Text>
                <Text className="mt-0.5 text-[11px] leading-[14px] text-ink/60">
                  СДЭК COD · курьеру или в пункте выдачи
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={greenman[7]} />
            </View>
            <View className="mt-3 flex-row gap-2 rounded-md bg-sand-1 p-3">
              <Ionicons name="information-circle-outline" size={16} color={ink[60]} />
              <Text className="flex-1 text-[13px] leading-[18px] text-ink/60">
                Итоговая сумма в рублях рассчитывается СДЭК перед оформлением.
              </Text>
            </View>
          </Card>
        ) : null}

        {step === 3 ? (
          <View className="gap-4">
            <Card variant="flat" radius="lg" padded="sm">
              <SummaryRow label="Получатель" value={`${formValues.customerName} · ${formValues.phoneNumber}`} />
              <SummaryRow label="Email" value={formValues.email} />
              <SummaryRow label="Город" value={selectedCity?.full_name || selectedCity?.city || '—'} />
              <SummaryRow
                label="Доставка"
                value={
                  deliveryMode === 'pvz'
                    ? `ПВЗ · ${selectedPvz?.full_address || selectedPvz?.address || selectedPvz?.name}`
                    : `До двери · ${address}`
                }
              />
              <SummaryRow label="Оплата" value="Наложенный платёж" />
            </Card>
            <Card variant="flat" radius="lg" padded="sm">
              <SummaryRow label="Товары (KZT)" value={`${subtotalKzt.toLocaleString('ru-RU')} ₸`} />
              <SummaryRow label="Доставка" value={calcFetching ? 'Расчёт...' : calcError ? 'Ошибка расчёта' : formatRub(deliveryRub)} />
              {calc?.period_min && calc.period_max ? (
                <Text className="mt-1 text-[11px] text-ink/60">
                  Срок: {calc.period_min}-{calc.period_max} дн.
                </Text>
              ) : null}
              <View className="my-3 h-px bg-border" />
              <SummaryRow label="Итого" value={formatRub(totalRub)} big />
            </Card>
          </View>
        ) : null}
      </ScrollView>

      <StickyCTA
        topSlot={
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] text-ink/60">Итого</Text>
            <Text className="font-display text-[17px] leading-[22px] text-ink">
              {calcFetching ? 'Расчёт...' : formatRub(totalRub)}
            </Text>
          </View>
        }
      >
        <Button
          label={step === 3 ? 'Оформить заказ' : 'Дальше'}
          size="lg"
          full
          disabled={!canGoNext}
          loading={isPending}
          onPress={primaryPress}
        />
      </StickyCTA>

      <PvzPickerSheet ref={pvzSheet} points={pvzPoints ?? []} onPick={pickPvz} />
    </View>
  );
}

function ModeChip({
  active,
  icon,
  title,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      className={`h-20 flex-1 items-center justify-center rounded-md border ${
        active ? 'border-greenman-7 bg-greenman-0' : 'border-ink/10 bg-white'
      }`}
    >
      <Ionicons name={icon} size={22} color={active ? greenman[7] : ink[60]} />
      <Text className="mt-1 text-[13px] font-semibold text-ink">{title}</Text>
    </Pressable>
  );
}

function SummaryRow({ label, value, big }: { label: string; value?: string | null; big?: boolean }) {
  return (
    <View className="py-1">
      <Text className="text-[11px] font-semibold uppercase text-ink/50">{label}</Text>
      <Text className={`${big ? 'font-display text-[28px] leading-[34px] text-greenman-7' : 'text-[15px] leading-[22px] text-ink'}`}>
        {value || '—'}
      </Text>
    </View>
  );
}
