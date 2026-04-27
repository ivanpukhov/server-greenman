import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
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
import { useCountryStore } from '@/stores/country.store';
import { useCreateOrder, useOrderProfiles } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/format/price';
import { formatKzPhoneInput, toApiPhoneKz } from '@/lib/format/phone';
import { checkoutKzSchema, type CheckoutKzValues } from '@/lib/validation/schemas';
import { findCities, type CityEntry } from '@/lib/data/cityData';
import {
  calcKzDelivery,
  isCashCity,
  isCityDeliveryCity,
  isIndriveCity,
  isKazpostCity,
  type KzDelivery,
} from '@/lib/checkout/kzDelivery';
import { AddressesSheet } from './AddressesSheet';
import type { OrderProfile } from '@/lib/api/types';

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: 'Получатель и адрес',
  2: 'Оплата',
  3: 'Подтверждение',
};

export function CheckoutKz() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const subtotal = useCartStore((s) => s.subtotal());
  const currency = useCountryStore((s) => s.currency);
  const { data: profiles } = useOrderProfiles();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const addressesSheet = useRef<BottomSheetModal>(null);
  const [step, setStep] = useState<Step>(1);
  const [suggestions, setSuggestions] = useState<CityEntry[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<CheckoutKzValues>({
    resolver: zodResolver(checkoutKzSchema),
    mode: 'onChange',
    defaultValues: {
      customerName: '',
      phoneNumber: '',
      kaspiNumber: '',
      city: '',
      addressIndex: '',
      street: '',
      houseNumber: '',
      deliveryMethod: undefined as unknown as KzDelivery,
      paymentMethod: undefined as unknown as CheckoutKzValues['paymentMethod'],
    },
  });

  const values = watch();
  const deliveryCost = useMemo(
    () => (values.deliveryMethod ? calcKzDelivery(values.deliveryMethod, items) : 0),
    [values.deliveryMethod, items],
  );
  const total = subtotal + deliveryCost;

  useEffect(() => {
    if (profiles?.length) addressesSheet.current?.present();
  }, [profiles]);

  useEffect(() => {
    if (values.deliveryMethod === 'kazpost' && !isKazpostCity(values.city)) {
      setValue('deliveryMethod', undefined as unknown as KzDelivery, { shouldValidate: true });
    }
    if (values.deliveryMethod === 'indrive' && !isIndriveCity(values.city)) {
      setValue('deliveryMethod', undefined as unknown as KzDelivery, { shouldValidate: true });
    }
    if (values.deliveryMethod === 'city' && !isCityDeliveryCity(values.city)) {
      setValue('deliveryMethod', undefined as unknown as KzDelivery, { shouldValidate: true });
    }
    if (values.paymentMethod === 'money' && !isCashCity(values.city)) {
      setValue('paymentMethod', undefined as unknown as CheckoutKzValues['paymentMethod'], { shouldValidate: true });
    }
  }, [setValue, values.city, values.deliveryMethod, values.paymentMethod]);

  const applyProfile = (profile: OrderProfile) => {
    const phone = formatKzPhoneInput(`+7${profile.phoneNumber}`);
    setValue('customerName', profile.name, { shouldValidate: true });
    setValue('addressIndex', profile.addressIndex ?? '', { shouldValidate: true });
    setValue('city', profile.city, { shouldValidate: true });
    setValue('street', profile.street ?? '', { shouldValidate: true });
    setValue('houseNumber', profile.houseNumber ?? '', { shouldValidate: true });
    setValue('phoneNumber', phone, { shouldValidate: true });
    setValue('kaspiNumber', phone, { shouldValidate: true });
    addressesSheet.current?.dismiss();
  };

  const onCityChange = (value: string) => {
    setValue('city', value, { shouldValidate: true });
    setSuggestions(findCities(value));
  };

  const pickCity = (entry: CityEntry) => {
    setValue('city', entry.city, { shouldValidate: true });
    setValue('addressIndex', entry.index, { shouldValidate: true });
    setSuggestions([]);
  };

  const step1Ready =
    values.customerName.trim().length > 1 &&
    values.phoneNumber.replace(/\D/g, '').length >= 11 &&
    values.city.trim().length > 1 &&
    values.addressIndex.replace(/\D/g, '').length === 6 &&
    values.street.trim().length > 0 &&
    values.houseNumber.trim().length > 0 &&
    !!values.deliveryMethod;
  const step2Ready =
    !!values.paymentMethod &&
    (values.paymentMethod !== 'kaspi' || values.kaspiNumber.replace(/\D/g, '').length >= 11);
  const canGoNext = step === 1 ? step1Ready : step === 2 ? step2Ready : isValid;

  const onSubmit = async (form: CheckoutKzValues) => {
    if (!items.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const order = await createOrder({
        customerName: form.customerName,
        addressIndex: form.addressIndex,
        city: form.city,
        street: form.street,
        houseNumber: form.houseNumber,
        phoneNumber: toApiPhoneKz(form.phoneNumber),
        kaspiNumber: toApiPhoneKz(form.kaspiNumber),
        deliveryMethod: form.deliveryMethod,
        paymentMethod: form.paymentMethod,
        products: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          typeId: item.type.id,
        })),
        totalPrice: total,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      clearCart();
      Toast.show({ type: 'success', text1: 'Заказ оформлен' });
      router.replace(order?.id ? `/order/${order.id}` : '/(tabs)/profile');
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Toast.show({ type: 'error', text1: 'Не удалось оформить заказ', text2: 'Попробуйте ещё раз.' });
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
            {profiles?.length ? (
              <Pressable
                onPress={() => addressesSheet.current?.present()}
                className="h-14 flex-row items-center rounded-md bg-greenman-0 px-4"
              >
                <Ionicons name="bookmark-outline" size={18} color={greenman[7]} />
                <Text className="ml-2 flex-1 text-[13px] font-semibold text-ink">
                  {profiles.length} сохранённых адресов
                </Text>
                <Ionicons name="chevron-forward" size={16} color={ink[40]} />
              </Pressable>
            ) : null}

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
                  name="phoneNumber"
                  render={({ field }) => (
                    <Input
                      label="Телефон"
                      keyboardType="phone-pad"
                      placeholder="+7 (___) ___-__-__"
                      value={field.value}
                      onChangeText={(text) => {
                        const next = formatKzPhoneInput(text);
                        field.onChange(next);
                        if (!values.kaspiNumber) setValue('kaspiNumber', next, { shouldValidate: true });
                      }}
                      error={errors.phoneNumber?.message}
                      leftIcon={<Ionicons name="logo-whatsapp" size={18} color={greenman[7]} />}
                    />
                  )}
                />
              </View>
            </Card>

            <Card variant="flat" radius="lg" padded="sm">
              <Text variant="meta-upper" className="mb-3 text-ink/50" tracking="wide">
                Куда доставить
              </Text>
              <View className="gap-3">
                <Controller
                  control={control}
                  name="city"
                  render={({ field }) => (
                    <Input
                      label="Город"
                      placeholder="Начните вводить..."
                      value={field.value}
                      onChangeText={onCityChange}
                      error={errors.city?.message}
                      leftIcon={<Ionicons name="location-outline" size={18} color={greenman[7]} />}
                    />
                  )}
                />
                {suggestions.length ? (
                  <View className="rounded-md border border-border bg-white">
                    {suggestions.slice(0, 5).map((entry, index) => (
                      <Pressable
                        key={`${entry.city}-${entry.index}`}
                        onPress={() => pickCity(entry)}
                        className={`px-4 py-3 ${index === suggestions.length - 1 ? '' : 'border-b border-border'}`}
                      >
                        <Text className="text-[13px] font-semibold text-ink">{entry.city}</Text>
                        <Text className="text-[11px] text-ink/60">Индекс {entry.index}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <Controller
                  control={control}
                  name="addressIndex"
                  render={({ field }) => (
                    <Input label="Индекс" keyboardType="number-pad" maxLength={6} value={field.value} onChangeText={(text) => field.onChange(text.replace(/\D/g, '').slice(0, 6))} error={errors.addressIndex?.message} />
                  )}
                />
                <Controller
                  control={control}
                  name="street"
                  render={({ field }) => (
                    <Input label="Улица" value={field.value} onChangeText={field.onChange} error={errors.street?.message} />
                  )}
                />
                <Controller
                  control={control}
                  name="houseNumber"
                  render={({ field }) => (
                    <Input label="Дом / квартира" value={field.value} onChangeText={field.onChange} error={errors.houseNumber?.message} />
                  )}
                />
              </View>
            </Card>

            <Card variant="flat" radius="lg" padded="sm">
              <Text variant="meta-upper" className="mb-3 text-ink/50" tracking="wide">
                Доставка
              </Text>
              <View className="gap-2">
                <OptionChip
                  active={values.deliveryMethod === 'kazpost'}
                  disabled={!isKazpostCity(values.city)}
                  onPress={() => setValue('deliveryMethod', 'kazpost', { shouldValidate: true })}
                  title="Казпочта"
                  desc={`3-7 дней · ${formatPrice(calcKzDelivery('kazpost', items), currency)}`}
                  icon="mail-outline"
                />
                <OptionChip
                  active={values.deliveryMethod === 'indrive'}
                  disabled={!isIndriveCity(values.city)}
                  onPress={() => setValue('deliveryMethod', 'indrive', { shouldValidate: true })}
                  title="inDrive"
                  desc={`Для избранных городов · ${formatPrice(4000, currency)}`}
                  icon="car-outline"
                />
                <OptionChip
                  active={values.deliveryMethod === 'city'}
                  disabled={!isCityDeliveryCity(values.city)}
                  onPress={() => setValue('deliveryMethod', 'city', { shouldValidate: true })}
                  title="Курьер по городу"
                  desc={`Петропавловск · ${formatPrice(1500, currency)}`}
                  icon="bicycle-outline"
                />
              </View>
            </Card>
          </View>
        ) : null}

        {step === 2 ? (
          <Card variant="flat" radius="lg" padded="sm">
            <Text variant="meta-upper" className="mb-3 text-ink/50" tracking="wide">
              Оплата
            </Text>
            <View className="gap-2">
              <OptionChip
                active={values.paymentMethod === 'kaspi'}
                onPress={() => setValue('paymentMethod', 'kaspi', { shouldValidate: true })}
                title="Kaspi QR"
                desc="По номеру в Kaspi Pay"
                icon="card-outline"
              />
              <OptionChip
                active={values.paymentMethod === 'money'}
                disabled={!isCashCity(values.city)}
                onPress={() => setValue('paymentMethod', 'money', { shouldValidate: true })}
                title="Наличные при получении"
                desc="Только Петропавловск"
                icon="cash-outline"
              />
              <Controller
                control={control}
                name="kaspiNumber"
                render={({ field }) => (
                  <Input
                    containerClassName="mt-2"
                    label="Номер Kaspi"
                    keyboardType="phone-pad"
                    placeholder="+7 (___) ___-__-__"
                    value={field.value}
                    onChangeText={(text) => field.onChange(formatKzPhoneInput(text))}
                    error={errors.kaspiNumber?.message}
                    leftIcon={<Ionicons name="card-outline" size={18} color={greenman[7]} />}
                  />
                )}
              />
              <View className="mt-2 flex-row gap-2 rounded-md bg-sand-1 p-3">
                <Ionicons name="information-circle-outline" size={16} color={ink[60]} />
                <Text className="flex-1 text-[13px] leading-[18px] text-ink/60">
                  После заказа менеджер свяжется с вами в WhatsApp для оплаты.
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {step === 3 ? (
          <View className="gap-4">
            <Card variant="flat" radius="lg" padded="sm">
              <SummaryRow label="Получатель" value={`${values.customerName} · ${values.phoneNumber}`} />
              <SummaryRow label="Адрес" value={`${values.city}, ${values.street}, ${values.houseNumber}`} />
              <SummaryRow label="Доставка" value={`${labelDelivery(values.deliveryMethod)} · ${formatPrice(deliveryCost, currency)}`} />
              <SummaryRow label="Оплата" value={labelPayment(values.paymentMethod)} />
            </Card>
            <Card variant="flat" radius="lg" padded="sm">
              <Text className="mb-3 text-[13px] font-semibold text-ink">Товары</Text>
              <View className="gap-2">
                {items.map((item) => (
                  <SummaryRow
                    key={`${item.productId}-${item.type.id}`}
                    label={`${item.productName} · ${item.type.type}`}
                    value={`${item.quantity} × ${formatPrice(item.type.price, currency)}`}
                  />
                ))}
              </View>
              <View className="my-3 h-px bg-border" />
              <SummaryRow label="Итого" value={formatPrice(total, currency)} big />
            </Card>
          </View>
        ) : null}
      </ScrollView>

      <StickyCTA
        topSlot={
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] text-ink/60">Итого</Text>
            <Text className="font-display text-[17px] leading-[22px] text-ink">
              {formatPrice(total, currency)}
            </Text>
          </View>
        }
      >
        <Button
          label={step === 3 ? 'Оформить заказ' : 'Дальше'}
          size="lg"
          full
          disabled={!canGoNext || items.length === 0}
          loading={isPending}
          onPress={primaryPress}
        />
      </StickyCTA>

      <AddressesSheet ref={addressesSheet} profiles={profiles ?? []} onPick={applyProfile} />
    </View>
  );
}

function OptionChip({
  active,
  disabled,
  onPress,
  title,
  desc,
  icon,
}: {
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  title: string;
  desc?: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      className={`min-h-20 flex-row items-center rounded-md border p-3 ${
        active ? 'border-greenman-7 bg-greenman-0' : 'border-ink/10 bg-white'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <View className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${active ? 'bg-greenman-7' : 'bg-greenman-0'}`}>
        <Ionicons name={icon} size={19} color={active ? '#fff' : greenman[7]} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-ink">{title}</Text>
        {desc ? <Text className="mt-0.5 text-[11px] leading-[14px] text-ink/60">{desc}</Text> : null}
      </View>
      {active ? <Ionicons name="checkmark-circle" size={20} color={greenman[7]} /> : null}
    </Pressable>
  );
}

function SummaryRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View className="py-1">
      <Text className="text-[11px] font-semibold uppercase text-ink/50">{label}</Text>
      <Text className={`${big ? 'font-display text-[28px] leading-[34px] text-greenman-7' : 'text-[15px] leading-[22px] text-ink'}`}>
        {value}
      </Text>
    </View>
  );
}

function labelDelivery(method?: string) {
  if (method === 'kazpost') return 'Казпочта';
  if (method === 'indrive') return 'inDrive';
  if (method === 'city') return 'Курьер';
  return '—';
}

function labelPayment(method?: string) {
  if (method === 'kaspi') return 'Kaspi QR';
  if (method === 'money') return 'Наличные';
  return '—';
}
