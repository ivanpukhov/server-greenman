import { useState } from 'react';
import { View, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { greenman } from '@/theme/colors';
import { useCountryStore } from '@/stores/country.store';
import { useMyOrders, useOrderProfiles, useDeleteOrderProfile } from '@/hooks/useOrders';
import { EmptyState } from '@/components/common/EmptyState';
import { formatPrice } from '@/lib/format/price';
import type { Order, OrderProfile } from '@/lib/api/types';

type Tab = 'orders' | 'addresses';

export default function ProfileScreen() {
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.userId);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const country = useCountryStore((s) => s.country);
  const setCountry = useCountryStore((s) => s.setCountry);
  const [tab, setTab] = useState<Tab>('orders');

  const orders = useMyOrders();
  const profiles = useOrderProfiles();

  if (!isAuth) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-display text-ink">Войдите в аккаунт</Text>
          <Text className="mt-2 text-center text-sm text-ink-dim">
            История заказов и сохранённые адреса доступны после входа.
          </Text>
          <Button
            label="Войти"
            className="mt-6 w-full"
            onPress={() => router.push('/auth/phone')}
          />
        </View>
      </Screen>
    );
  }

  const confirmLogout = () => {
    Alert.alert('Выход', 'Выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={orders.isRefetching || profiles.isRefetching}
            onRefresh={() => {
              orders.refetch();
              profiles.refetch();
            }}
            tintColor="#0e9a47"
          />
        }
      >
        <View className="pt-4">
          <Text className="text-2xl font-display text-ink">Профиль</Text>
          <Text className="mt-1 text-sm text-ink-dim">Пользователь #{userId}</Text>
        </View>

        <View className="mt-5 overflow-hidden rounded-xl border border-border bg-white">
          <NavRow
            icon="bookmark-outline"
            title="Сохранённое"
            subtitle="Посты, статьи, reels и курсы"
            onPress={() => router.push('/profile/bookmarks')}
          />
          <Divider />
          <NavRow
            icon="repeat-outline"
            title="Мои репосты"
            subtitle="То, чем вы поделились"
            onPress={() => router.push('/profile/reposts')}
          />
          <Divider />
          <NavRow
            icon="school-outline"
            title="Мои курсы"
            subtitle="Прогресс и следующий день"
            onPress={() => router.push('/social/my-courses')}
          />
          <Divider />
          <NavRow
            icon="reader-outline"
            title="Домашние задания"
            subtitle="Отчёты и их статусы"
            onPress={() => router.push('/profile/homework')}
          />
          <Divider />
          <NavRow
            icon="heart-outline"
            title="Активность"
            subtitle="Что вы лайкали"
            onPress={() => router.push('/profile/activity')}
          />
        </View>

        <View className="mt-5 rounded-xl border border-border bg-white p-4">
          <Text className="text-sm font-semibold text-ink">Страна</Text>
          <View className="mt-3 flex-row gap-2">
            <CountryChip
              active={country === 'KZ'}
              label="Казахстан"
              onPress={() => setCountry('KZ')}
            />
            <CountryChip
              active={country === 'RF'}
              label="Россия"
              onPress={() => setCountry('RF')}
            />
          </View>
        </View>

        <View className="mt-6 flex-row gap-2">
          <TabChip active={tab === 'orders'} label="Заказы" onPress={() => setTab('orders')} />
          <TabChip active={tab === 'addresses'} label="Адреса" onPress={() => setTab('addresses')} />
        </View>

        <View className="mt-4">
          {tab === 'orders' ? (
            <OrdersList
              loading={orders.isLoading}
              error={!!orders.error}
              data={orders.data ?? []}
              onPress={(id) => router.push(`/order/${id}`)}
            />
          ) : (
            <AddressesList
              loading={profiles.isLoading}
              error={!!profiles.error}
              data={profiles.data ?? []}
            />
          )}
        </View>

        <Pressable
          onPress={() => router.push(isAdmin ? '/admin' : '/admin/login')}
          className="mt-6 flex-row items-center justify-between rounded-xl border border-border bg-white p-4 active:bg-greenman-0"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-greenman-0">
              <Ionicons name="shield-checkmark-outline" size={20} color={greenman[7]} />
            </View>
            <View>
              <Text className="text-sm font-semibold text-ink">Админ-панель</Text>
              <Text className="text-xs text-ink-dim">
                {isAdmin ? 'Вы вошли как админ' : 'Управление контентом'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={greenman[7]} />
        </Pressable>

        <View className="mt-10">
          <Button label="Выйти" variant="secondary" onPress={confirmLogout} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function NavRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 px-4 py-3 active:bg-greenman-0"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-greenman-0">
        <Ionicons name={icon} size={20} color={greenman[7]} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-ink">{title}</Text>
        {subtitle ? <Text className="text-xs text-ink-dim">{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={greenman[7]} />
    </Pressable>
  );
}

function Divider() {
  return <View className="h-px bg-border" style={{ marginLeft: 68 }} />;
}

function CountryChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-full py-2 ${active ? 'bg-greenman-7' : 'bg-greenman-0'}`}
    >
      <Text
        className={`text-center text-sm font-semibold ${active ? 'text-white' : 'text-greenman-8'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TabChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-4 py-2 ${active ? 'bg-greenman-7' : 'bg-greenman-0'}`}
    >
      <Text
        className={`text-sm font-semibold ${active ? 'text-white' : 'text-greenman-8'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function OrdersList({
  loading,
  error,
  data,
  onPress,
}: {
  loading: boolean;
  error: boolean;
  data: Order[];
  onPress: (id: number) => void;
}) {
  if (loading) {
    return (
      <View className="gap-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </View>
    );
  }
  if (error) {
    return <EmptyState variant="error" title="Не удалось загрузить заказы" />;
  }
  if (data.length === 0) {
    return (
      <EmptyState title="Пока нет заказов" subtitle="Оформите первый заказ в каталоге." />
    );
  }
  return (
    <View className="gap-2">
      {data.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => onPress(o.id)}
          className="rounded-xl border border-border bg-white p-4 active:bg-greenman-0"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-ink">Заказ #{o.id}</Text>
            <Text className="text-xs font-semibold text-greenman-7">{o.status}</Text>
          </View>
          <Text className="mt-2 text-base font-display text-ink">
            {formatPrice(o.totalPrice, (o.currency as 'KZT' | 'RUB') ?? 'KZT')}
          </Text>
          <Text className="mt-1 text-xs text-ink-dim" numberOfLines={1}>
            {o.city}
            {o.street ? `, ${o.street}` : ''}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function AddressesList({
  loading,
  error,
  data,
}: {
  loading: boolean;
  error: boolean;
  data: OrderProfile[];
}) {
  const { mutate: remove, isPending } = useDeleteOrderProfile();

  if (loading) {
    return (
      <View className="gap-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </View>
    );
  }
  if (error) {
    return <EmptyState variant="error" title="Не удалось загрузить адреса" />;
  }
  if (data.length === 0) {
    return (
      <EmptyState
        title="Адресов пока нет"
        subtitle="Оформите первый заказ — адрес сохранится автоматически."
      />
    );
  }
  const onDelete = (p: OrderProfile) => {
    Alert.alert('Удалить адрес?', `${p.city}${p.street ? ', ' + p.street : ''}`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => remove(p.id) },
    ]);
  };
  return (
    <View className="gap-2">
      {data.map((p) => (
        <View key={p.id} className="rounded-xl border border-border bg-white p-4">
          <Text className="text-base font-semibold text-ink">{p.name}</Text>
          <Text className="mt-1 text-sm text-ink-dim">
            {p.city}
            {p.street ? `, ${p.street}` : ''}
            {p.houseNumber ? `, ${p.houseNumber}` : ''}
          </Text>
          <View className="mt-3 flex-row justify-end">
            <Pressable
              onPress={() => onDelete(p)}
              disabled={isPending}
              className="rounded-full bg-greenman-0 px-3 py-1.5 active:opacity-80"
            >
              <Text className="text-xs font-semibold text-red-600">Удалить</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}
