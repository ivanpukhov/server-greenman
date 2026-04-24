import { View, ScrollView, Alert, RefreshControl, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Shimmer } from '@/components/ui/Shimmer';
import { useAuthStore } from '@/stores/auth.store';
import { greenman, clay, sun, sand, ink } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { useCountryStore } from '@/stores/country.store';
import { useMyOrders, useOrderProfiles, useDeleteOrderProfile } from '@/hooks/useOrders';
import { useProfile } from '@/hooks/useProfile';
import { formatPrice } from '@/lib/format/price';
import { ProfileHero } from '@/components/profile/ProfileHero';
import type { Order, OrderProfile } from '@/lib/api/types';

cssInterop(LinearGradient, { className: 'style' });

const SCREEN_W = Dimensions.get('window').width;

type StatusTone = {
  bg: string;
  dot: string;
  text: string;
};

function statusTone(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s.includes('отправ')) return { bg: 'bg-sun-1', dot: sun[3], text: 'text-ink' };
  if (s.includes('оплач')) return { bg: 'bg-greenman-1', dot: greenman[7], text: 'text-greenman-9' };
  if (s.includes('достав')) return { bg: 'bg-sand-1', dot: sand[4], text: 'text-ink/70' };
  if (s.includes('отмен')) return { bg: 'bg-sand-1', dot: '#b00', text: 'text-ink/50' };
  return { bg: 'bg-clay-0', dot: clay[4], text: 'text-clay-6' };
}

export default function ProfileScreen() {
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.userId);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const storedDisplayName = useAuthStore((s) => s.displayName);
  const country = useCountryStore((s) => s.country);
  const setCountry = useCountryStore((s) => s.setCountry);

  const profile = useProfile();
  const orders = useMyOrders();
  const profiles = useOrderProfiles();

  if (!isAuth) {
    return <UnauthedState onLogin={() => router.push('/auth/phone')} />;
  }

  const confirmLogout = () => {
    Alert.alert('Выход', 'Выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const ordersData = orders.data ?? [];
  const profilesData = profiles.data ?? [];
  const displayName = profile.data?.displayName || storedDisplayName || `Пользователь #${userId}`;

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={profile.isRefetching || orders.isRefetching || profiles.isRefetching}
            onRefresh={() => {
              profile.refetch();
              orders.refetch();
              profiles.refetch();
            }}
            tintColor={ink.DEFAULT}
          />
        }
      >
        <ProfileHero
          name={displayName}
          subtitle={country === 'KZ' ? 'Казахстан' : 'Россия'}
          stats={[
            { value: ordersData.length, label: 'Заказов' },
            { value: profilesData.length, label: 'Адресов' },
            { value: isAdmin ? '∞' : '—', label: 'Курсов' },
          ]}
          onSettings={() => router.push('/profile/settings' as any)}
        />

        <View className="mt-6 px-5">
          <ActionGrid router={router} />
        </View>

        <View className="mt-8 px-5">
          <View className="flex-row items-end justify-between">
            <View>
              <Text variant="meta-upper" tracking="widest" className="text-ink/50">
                Заказы
              </Text>
              <Text
                variant="display-serif"
                className="mt-1 text-ink"
                style={{ fontSize: 26, lineHeight: 30 }}
              >
                Мои заказы
              </Text>
            </View>
            {ordersData.length > 0 ? (
              <AnimatedPressable onPress={() => router.push('/order/list' as any)} haptic="selection">
                <View className="flex-row items-center">
                  <Text className="text-[13px] font-bold text-ink" tracking="tight">
                    Все
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={ink.DEFAULT} style={{ marginLeft: 4 }} />
                </View>
              </AnimatedPressable>
            ) : null}
          </View>
        </View>

        <OrdersRail
          loading={orders.isLoading}
          error={!!orders.error}
          data={ordersData}
          onPress={(id) => router.push(`/order/${id}`)}
        />

        <View className="mt-8 px-5">
          <View className="flex-row items-end justify-between">
            <View>
              <Text variant="meta-upper" tracking="widest" className="text-ink/50">
                Доставка
              </Text>
              <Text
                variant="display-serif"
                className="mt-1 text-ink"
                style={{ fontSize: 26, lineHeight: 30 }}
              >
                Адреса
              </Text>
            </View>
          </View>
          <View className="mt-3">
            <AddressesList loading={profiles.isLoading} error={!!profiles.error} data={profilesData} />
          </View>
        </View>

        <View className="mt-8 px-5">
          <View className="flex-row gap-2">
            <CountryPill active={country === 'KZ'} country="KZ" label="Казахстан" onPress={() => setCountry('KZ')} />
            <CountryPill active={country === 'RF'} country="RF" label="Россия" onPress={() => setCountry('RF')} />
          </View>
        </View>

        {isAdmin ? (
          <View className="mt-8 px-5">
            <AnimatedPressable onPress={() => router.push('/admin')} haptic="selection">
              <LinearGradient
                colors={['#05210f', ink.DEFAULT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 22, padding: 20, ...shadows.card }}
              >
                <View className="flex-row items-center gap-4">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-pill"
                    style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                  >
                    <Ionicons name="shield-checkmark" size={22} color={sun[2]} />
                  </View>
                  <View className="flex-1">
                    <Text variant="meta-upper" tracking="widest" className="text-white/60">
                      Админ
                    </Text>
                    <Text
                      className="mt-0.5 text-white"
                      style={{ fontFamily: 'SourceSerifPro_700Bold', fontSize: 20, lineHeight: 24 }}
                    >
                      Панель управления
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                </View>
              </LinearGradient>
            </AnimatedPressable>
          </View>
        ) : null}

        <View className="mt-10 px-5">
          <Button label="Выйти из аккаунта" variant="secondary" onPress={confirmLogout} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function ActionGrid({ router }: { router: ReturnType<typeof useRouter> }) {
  const items: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    bg: string;
    iconBg: string;
    iconColor: string;
    onPress: () => void;
  }[] = [
    {
      icon: 'bookmark',
      title: 'Сохранённое',
      subtitle: 'Посты, статьи',
      bg: 'bg-sand-1',
      iconBg: '#ffffff',
      iconColor: ink.DEFAULT,
      onPress: () => router.push('/profile/bookmarks'),
    },
    {
      icon: 'repeat',
      title: 'Репосты',
      subtitle: 'То, чем делились',
      bg: 'bg-greenman-0',
      iconBg: greenman[8],
      iconColor: '#ffffff',
      onPress: () => router.push('/profile/reposts'),
    },
    {
      icon: 'school',
      title: 'Курсы',
      subtitle: 'Прогресс',
      bg: 'bg-clay-0',
      iconBg: clay[4],
      iconColor: '#ffffff',
      onPress: () => router.push('/social/my-courses'),
    },
    {
      icon: 'reader',
      title: 'Задания',
      subtitle: 'Статусы отчётов',
      bg: 'bg-sun-0',
      iconBg: ink.DEFAULT,
      iconColor: sun[2],
      onPress: () => router.push('/profile/homework'),
    },
  ];
  return (
    <View className="flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
      {items.map((it) => (
        <AnimatedPressable
          key={it.title}
          onPress={it.onPress}
          haptic="selection"
          wrapperStyle={{ width: (SCREEN_W - 40 - 12) / 2, ...shadows.flat }}
        >
          <View className={`rounded-lg ${it.bg} p-4`} style={{ minHeight: 130 }}>
            <View
              className="h-11 w-11 items-center justify-center rounded-pill"
              style={{ backgroundColor: it.iconBg }}
            >
              <Ionicons name={it.icon} size={20} color={it.iconColor} />
            </View>
            <Text
              className="mt-4 text-ink"
              style={{ fontFamily: 'SourceSerifPro_700Bold', fontSize: 18, lineHeight: 22 }}
            >
              {it.title}
            </Text>
            <Text className="mt-0.5 text-[12px] text-ink/60" tracking="tight">
              {it.subtitle}
            </Text>
          </View>
        </AnimatedPressable>
      ))}
    </View>
  );
}

function OrdersRail({
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}
      >
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 280 }} className="overflow-hidden rounded-xl bg-white p-4">
            <Shimmer style={{ height: 16, width: '40%', borderRadius: 6 }} />
            <Shimmer style={{ height: 24, width: '60%', borderRadius: 6, marginTop: 12 }} />
            <Shimmer style={{ height: 12, width: '90%', borderRadius: 6, marginTop: 12 }} />
          </View>
        ))}
      </ScrollView>
    );
  }
  if (error) {
    return (
      <View className="mx-5 mt-3 items-center rounded-xl bg-sand-1 px-4 py-10">
        <Ionicons name="cloud-offline-outline" size={32} color={sand[3]} />
        <Text className="mt-3 text-ink/60">Не удалось загрузить</Text>
      </View>
    );
  }
  if (data.length === 0) {
    return (
      <View className="mx-5 mt-3 items-center overflow-hidden rounded-xl bg-surface-cream px-4 py-10">
        <Ionicons name="cube-outline" size={32} color={sand[4]} />
        <Text className="mt-3 text-ink/60">Пока нет заказов</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={280 + 12}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}
    >
      {data.slice(0, 8).map((o) => {
        const tone = statusTone(o.status);
        return (
          <AnimatedPressable
            key={o.id}
            onPress={() => onPress(o.id)}
            haptic="selection"
            wrapperStyle={{ width: 280, ...shadows.flat }}
          >
            <View className="overflow-hidden rounded-xl bg-white p-4">
              <View className="flex-row items-center justify-between">
                <View className={`flex-row items-center rounded-pill ${tone.bg} px-3 py-1`}>
                  <View
                    style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone.dot, marginRight: 6 }}
                  />
                  <Text className={`text-[11px] font-bold ${tone.text}`} tracking="wide">
                    {o.status}
                  </Text>
                </View>
                <Text variant="meta-upper" tracking="widest" className="text-ink/40">
                  #{o.id}
                </Text>
              </View>
              <Text
                className="mt-4 text-ink"
                style={{ fontFamily: 'SourceSerifPro_700Bold', fontSize: 24, lineHeight: 28 }}
              >
                {formatPrice(o.totalPrice, (o.currency as 'KZT' | 'RUB') ?? 'KZT')}
              </Text>
              <View className="mt-3 flex-row items-center">
                <Ionicons name="location-outline" size={13} color={sand[4]} />
                <Text className="ml-1 flex-1 text-[12px] text-ink/60" numberOfLines={1} tracking="tight">
                  {o.city}
                  {o.street ? `, ${o.street}` : ''}
                </Text>
              </View>
            </View>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
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
        {[0, 1].map((i) => (
          <View key={i} className="overflow-hidden rounded-xl bg-white p-4">
            <Shimmer style={{ height: 14, width: '40%', borderRadius: 6 }} />
            <Shimmer style={{ height: 12, width: '80%', borderRadius: 6, marginTop: 8 }} />
          </View>
        ))}
      </View>
    );
  }
  if (error) {
    return (
      <View className="items-center rounded-xl bg-sand-1 px-4 py-8">
        <Text className="text-ink/60">Не удалось загрузить</Text>
      </View>
    );
  }
  if (data.length === 0) {
    return (
      <View className="items-center rounded-xl border border-dashed border-sand-3 px-4 py-8">
        <Ionicons name="location-outline" size={26} color={sand[4]} />
        <Text className="mt-2 text-ink/60">Адресов пока нет</Text>
      </View>
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
        <View
          key={p.id}
          className="flex-row items-center gap-3 overflow-hidden rounded-xl bg-white p-4"
          style={shadows.flat}
        >
          <View className="h-10 w-10 items-center justify-center rounded-pill bg-sand-1">
            <Ionicons name="location" size={18} color={ink.DEFAULT} />
          </View>
          <View className="flex-1">
            <Text
              className="text-ink"
              style={{ fontFamily: 'SourceSerifPro_600SemiBold', fontSize: 16, lineHeight: 20 }}
            >
              {p.city}
            </Text>
            <Text className="mt-0.5 text-[12px] text-ink/60" numberOfLines={1} tracking="tight">
              {p.street ?? ''}
              {p.houseNumber ? `, ${p.houseNumber}` : ''}
            </Text>
          </View>
          <AnimatedPressable onPress={() => onDelete(p)} disabled={isPending} haptic="light" scale={0.9}>
            <View className="h-9 w-9 items-center justify-center rounded-pill bg-sand-1">
              <Ionicons name="trash-outline" size={16} color={ink.DEFAULT} />
            </View>
          </AnimatedPressable>
        </View>
      ))}
    </View>
  );
}

function CountryPill({
  active,
  label,
  country,
  onPress,
}: {
  active: boolean;
  label: string;
  country: 'KZ' | 'RF';
  onPress: () => void;
}) {
  const flag = country === 'KZ' ? '🇰🇿' : '🇷🇺';
  const currency = country === 'KZ' ? 'KZT' : 'RUB';
  return (
    <AnimatedPressable onPress={onPress} haptic="selection" wrapperStyle={{ flex: 1 }}>
      <View
        className={`min-h-[58px] justify-center rounded-lg px-3 py-2.5 ${
          active ? 'bg-ink' : 'bg-sand-1'
        }`}
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-[18px]">{flag}</Text>
          <View className="min-w-0 flex-1">
            <Text
              className={`text-[13px] font-bold ${active ? 'text-white' : 'text-ink'}`}
              tracking="tight"
              numberOfLines={1}
            >
              {label}
            </Text>
            <Text className={`mt-0.5 text-[11px] ${active ? 'text-white/60' : 'text-ink/50'}`}>
              {currency}
            </Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function UnauthedState({ onLogin }: { onLogin: () => void }) {
  return (
    <Screen edges={['left', 'right']}>
      <View className="flex-1">
        <LinearGradient
          colors={['#05210f', greenman[10], greenman[8]]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 80,
            paddingBottom: 100,
            justifyContent: 'space-between',
          }}
        >
          <View>
            <View
              className="self-start rounded-pill px-3 py-1"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              <Text variant="meta-upper" tracking="widest" className="text-white/80">
                Greenman
              </Text>
            </View>
            <Text
              className="mt-8 text-white"
              style={{ fontFamily: 'SourceSerifPro_700Bold', fontSize: 36, lineHeight: 40 }}
            >
              Ваш личный{'\n'}<Text style={{ fontStyle: 'italic' }}>растительный мир</Text>
            </Text>
            <Text className="mt-4 text-[15px] text-white/70" tracking="tight">
              Войдите, чтобы видеть заказы, сохранять статьи и проходить курсы.
            </Text>
          </View>

          <View>
            <Button label="Войти по телефону" onPress={onLogin} variant="inverse" size="lg" />
            <View className="mt-3 items-center">
              <Text className="text-[12px] text-white/50" tracking="tight">
                Продолжая, вы принимаете условия использования
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Screen>
  );
}
