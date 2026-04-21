import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { greenman } from '@/theme/colors';
import { useCartStore } from '@/stores/cart.store';
import { useCountryStore } from '@/stores/country.store';
import { useCreateOrder, useOrderProfiles } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/format/price';
import { toApiPhoneKz, formatKzPhoneInput } from '@/lib/format/phone';
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

export function CheckoutKz() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const currency = useCountryStore((s) => s.currency);
  const subtotal = useCartStore((s) => s.subtotal());

  const { data: profiles } = useOrderProfiles();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const addressesSheet = useRef<BottomSheetModal>(null);
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

  const city = watch('city');
  const delivery = watch('deliveryMethod');
  const payment = watch('paymentMethod');

  useEffect(() => {
    if (profiles && profiles.length > 0) {
      addressesSheet.current?.present();
    }
  }, [profiles]);

  const deliveryCost = useMemo(
    () => (delivery ? calcKzDelivery(delivery, items) : 0),
    [delivery, items]
  );
  const total = subtotal + deliveryCost;

  const applyProfile = (p: OrderProfile) => {
    const displayed = formatKzPhoneInput(`+7${p.phoneNumber}`);
    setValue('customerName', p.name, { shouldValidate: true });
    setValue('addressIndex', p.addressIndex ?? '', { shouldValidate: true });
    setValue('city', p.city, { shouldValidate: true });
    setValue('street', p.street ?? '', { shouldValidate: true });
    setValue('houseNumber', p.houseNumber ?? '', { shouldValidate: true });
    setValue('phoneNumber', displayed, { shouldValidate: true });
    setValue('kaspiNumber', displayed, { shouldValidate: true });
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
    if (delivery === 'indrive' && !isIndriveCity(entry.city)) {
      setValue('deliveryMethod', undefined as unknown as KzDelivery);
    }
    if (delivery === 'city' && !isCityDeliveryCity(entry.city)) {
      setValue('deliveryMethod', undefined as unknown as KzDelivery);
    }
    if (delivery === 'kazpost' && !isKazpostCity(entry.city)) {
      setValue('deliveryMethod', undefined as unknown as KzDelivery);
    }
    if (payment === 'money' && !isCashCity(entry.city)) {
      setValue('paymentMethod', undefined as unknown as CheckoutKzValues['paymentMethod']);
    }
  };

  const onSubmit = async (values: CheckoutKzValues) => {
    if (items.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const order = await createOrder({
        customerName: values.customerName,
        addressIndex: values.addressIndex,
        city: values.city,
        street: values.street,
        houseNumber: values.houseNumber,
        phoneNumber: toApiPhoneKz(values.phoneNumber),
        kaspiNumber: toApiPhoneKz(values.kaspiNumber),
        deliveryMethod: values.deliveryMethod,
        paymentMethod: values.paymentMethod,
        products: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          typeId: it.type.id,
        })),
        totalPrice: total,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      clearCart();
      Toast.show({ type: 'success', text1: 'Заказ оформлен' });
      if (order?.id) {
        router.replace(`/order/${order.id}`);
      } else {
        router.replace('/(tabs)/profile');
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Toast.show({ type: 'error', text1: 'Не удалось оформить заказ', text2: 'Попробуйте ещё раз.' });
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 200 }} keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-display text-ink">Оформление заказа</Text>
        <Text className="mt-1 text-sm text-ink-dim">Казахстан · {formatPrice(subtotal, currency)}</Text>

        {profiles && profiles.length > 0 ? (
          <Pressable
            onPress={() => addressesSheet.current?.present()}
            className="mt-4 rounded-xl border border-greenman-2 bg-greenman-0 p-4 active:opacity-80"
          >
            <Text className="text-sm font-semibold text-greenman-8">Сохранённые адреса</Text>
            <Text className="mt-1 text-xs text-ink-dim">Нажмите, чтобы выбрать сохранённый адрес.</Text>
          </Pressable>
        ) : null}

        <View className="mt-6 gap-3">
          <Controller
            control={control}
            name="customerName"
            render={({ field }) => (
              <Input
                variant="floating"
                label="ФИО"
                placeholder="Иван Иванов"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.customerName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field }) => (
              <Input
                variant="floating"
                label="Телефон WhatsApp"
                placeholder="+7 (___) ___-__-__"
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={(t) => field.onChange(formatKzPhoneInput(t))}
                error={errors.phoneNumber?.message}
                leftIcon={<Ionicons name="logo-whatsapp" size={18} color={greenman[7]} />}
              />
            )}
          />
          <Controller
            control={control}
            name="kaspiNumber"
            render={({ field }) => (
              <Input
                variant="floating"
                label="Номер Kaspi"
                placeholder="+7 (___) ___-__-__"
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={(t) => field.onChange(formatKzPhoneInput(t))}
                error={errors.kaspiNumber?.message}
                leftIcon={<Ionicons name="card-outline" size={18} color={greenman[7]} />}
              />
            )}
          />
          <View>
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <Input
                  variant="floating"
                  label="Город"
                  placeholder="Начните вводить..."
                  value={field.value}
                  onChangeText={onCityChange}
                  autoCorrect={false}
                  error={errors.city?.message}
                  leftIcon={<Ionicons name="location-outline" size={18} color={greenman[7]} />}
                />
              )}
            />
            {suggestions.length > 0 ? (
              <View className="mt-2 rounded-xl border border-border bg-white">
                {suggestions.map((s, idx) => (
                  <Pressable
                    key={`${s.city}-${s.index}`}
                    onPress={() => pickCity(s)}
                    className={`px-4 py-3 ${idx === suggestions.length - 1 ? '' : 'border-b border-border'} active:bg-greenman-0`}
                  >
                    <Text className="text-sm text-ink">{s.city}</Text>
                    <Text className="text-xs text-ink-dim">Индекс {s.index}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <Controller
            control={control}
            name="street"
            render={({ field }) => (
              <Input
                variant="floating"
                label="Улица"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.street?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="houseNumber"
            render={({ field }) => (
              <Input
                variant="floating"
                label="Дом / квартира"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.houseNumber?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="addressIndex"
            render={({ field }) => (
              <Input
                variant="floating"
                label="Индекс"
                placeholder="6 цифр"
                keyboardType="number-pad"
                maxLength={6}
                value={field.value}
                onChangeText={(t) => field.onChange(t.replace(/\D/g, '').slice(0, 6))}
                error={errors.addressIndex?.message}
              />
            )}
          />
        </View>

        <View className="mt-8">
          <Text className="text-lg font-bold text-ink">Способ доставки</Text>
          <View className="mt-3 gap-2">
            {isKazpostCity(city) ? (
              <OptionChip
                active={delivery === 'kazpost'}
                onPress={() => setValue('deliveryMethod', 'kazpost', { shouldValidate: true })}
                title="Казпочта"
                desc={`≈ ${formatPrice(calcKzDelivery('kazpost', items), currency)}`}
                icon="mail-outline"
              />
            ) : null}
            {isCityDeliveryCity(city) ? (
              <OptionChip
                active={delivery === 'city'}
                onPress={() => setValue('deliveryMethod', 'city', { shouldValidate: true })}
                title="Курьер по городу"
                desc={formatPrice(1500, currency)}
                icon="bicycle-outline"
              />
            ) : null}
            {isIndriveCity(city) ? (
              <OptionChip
                active={delivery === 'indrive'}
                onPress={() => setValue('deliveryMethod', 'indrive', { shouldValidate: true })}
                title="inDrive"
                desc={formatPrice(4000, currency)}
                icon="car-outline"
              />
            ) : null}
            {!city ? (
              <Text className="text-sm text-ink-dim">Сначала выберите город.</Text>
            ) : null}
          </View>
        </View>

        <View className="mt-8">
          <Text className="text-lg font-bold text-ink">Оплата</Text>
          <View className="mt-3 gap-2">
            <OptionChip
              active={payment === 'kaspi'}
              onPress={() => setValue('paymentMethod', 'kaspi', { shouldValidate: true })}
              title="Kaspi"
              desc="Счёт придёт в Kaspi"
              icon="card-outline"
            />
            {isCashCity(city) ? (
              <OptionChip
                active={payment === 'money'}
                onPress={() => setValue('paymentMethod', 'money', { shouldValidate: true })}
                title="Наличные"
                desc="При получении"
                icon="cash-outline"
              />
            ) : null}
          </View>
        </View>

        <View className="mt-8 rounded-xl bg-greenman-0 p-5">
          <Row label="Товары" value={formatPrice(subtotal, currency)} />
          <Row
            label="Доставка"
            value={delivery ? formatPrice(deliveryCost, currency) : '—'}
          />
          <View className="my-3 h-px bg-greenman-2" />
          <Row label="Итого" value={formatPrice(total, currency)} big />
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-5 pb-8 pt-3">
        <Button
          label={isPending ? 'Отправка...' : 'Оформить заказ'}
          size="lg"
          disabled={!isValid || items.length === 0}
          loading={isPending}
          onPress={handleSubmit(onSubmit)}
        />
      </View>

      <AddressesSheet
        ref={addressesSheet}
        profiles={profiles ?? []}
        onPick={applyProfile}
      />
    </>
  );
}

function OptionChip({
  active,
  onPress,
  title,
  desc,
  icon,
}: {
  active: boolean;
  onPress: () => void;
  title: string;
  desc?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      className={`flex-row items-center rounded-xl border p-4 active:opacity-80 ${active ? 'border-greenman-6 bg-greenman-0' : 'border-border bg-white'}`}
    >
      {icon ? (
        <View className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${active ? 'bg-greenman-7' : 'bg-greenman-0'}`}>
          <Ionicons name={icon} size={18} color={active ? '#fff' : greenman[7]} />
        </View>
      ) : null}
      <View className="flex-1">
        <Text className={`text-base font-semibold ${active ? 'text-greenman-8' : 'text-ink'}`}>
          {title}
        </Text>
        {desc ? <Text className="mt-0.5 text-xs text-ink-dim">{desc}</Text> : null}
      </View>
      <View className={`h-6 w-6 items-center justify-center rounded-full border-2 ${active ? 'border-greenman-7 bg-greenman-7' : 'border-border'}`}>
        {active ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
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
