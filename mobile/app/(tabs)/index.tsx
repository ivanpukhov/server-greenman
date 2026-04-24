import { useMemo } from 'react';
import { ScrollView, View, RefreshControl, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { IconButton } from '@/components/ui/IconButton';
import { Section } from '@/components/ui/Section';
import { Chip } from '@/components/ui/Chip';
import { ProductRail } from '@/components/product/ProductRail';
import { useProducts } from '@/hooks/useProducts';
import { useCountryStore } from '@/stores/country.store';
import { useAuthStore } from '@/stores/auth.store';
import { useMyOrders } from '@/hooks/useOrders';
import { greenman, clay, sand, sun } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { formatPrice } from '@/lib/format/price';
import { CountryMark } from '@/components/ui/CountryMark';
import { FeedStoriesRow, type StoryGroupItem } from '@/components/social/FeedStoriesRow';
import { socialApi } from '@/features/social/api';

const WHATSAPP_URL = 'https://wa.me/77001234567';
const QUICK_GAP = 12;
const QUICK_TILE_W = 156;

function greetingKey(): 'morning' | 'day' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'day';
  return 'evening';
}

const GREETING_TEXT: Record<string, string> = {
  morning: 'Доброе утро',
  day: 'Добрый день',
  evening: 'Добрый вечер',
  night: 'Доброй ночи',
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: products, isLoading, refetch, isRefetching } = useProducts();
  const storiesQuery = useQuery({
    queryKey: ['social', 'stories', 'active'],
    queryFn: async () => {
      const data = await socialApi.stories.active();
      return (Array.isArray(data) ? data : []) as StoryGroupItem[];
    },
    staleTime: 30_000,
  });
  const country = useCountryStore((s) => s.country);
  const currency = useCountryStore((s) => s.currency);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const orders = useMyOrders();

  const sorted = useMemo(() => products ?? [], [products]);
  const top = useMemo(() => sorted.slice(0, 8), [sorted]);

  const activeOrder = orders.data?.find(
    (o) => o.status !== 'доставлено' && o.status !== 'отменен',
  );

  const searchPresets = (t('main.search_presets.items', { returnObjects: true }) as string[]) ?? [];

  const greetingText = GREETING_TEXT[greetingKey()];
  const stories = storiesQuery.data ?? [];

  const openWA = () => {
    Haptics.selectionAsync().catch(() => {});
    Linking.openURL(WHATSAPP_URL).catch(() => {});
  };

  return (
    <Screen edges={['left', 'right']} className="bg-surface-cream">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
            <RefreshControl
              refreshing={isRefetching || storiesQuery.isRefetching}
              onRefresh={() => {
                refetch();
                storiesQuery.refetch();
              }}
              tintColor={greenman[9]}
            />
        }
        removeClippedSubviews
      >
        {/* =========== HERO =========== */}
        <LinearGradient
          colors={['#05210f', '#0b2a17', '#04401d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 14,
            paddingHorizontal: 22,
            paddingBottom: 54,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          {/* top row: country + menu */}
          <View className="flex-row items-center justify-between">
            <AnimatedPressable
              onPress={() => router.push('/country-modal')}
              haptic="selection"
              wrapperClassName=""
              className="flex-row items-center gap-2 rounded-pill border border-white/15 bg-white/10 py-1.5 pl-2 pr-3"
            >
              <CountryMark country={country} size="sm" active />
              <Text
                className="text-[11px] font-bold uppercase text-white"
                tracking="wide"
              >
                GREENMAN · {country}
              </Text>
              <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.7)" />
            </AnimatedPressable>
            <View className="flex-row gap-2">
              <IconButton
                icon={<Ionicons name="heart-outline" size={18} color="#fff" />}
                tone="glass"
                size="sm"
                onPress={() => router.push('/profile/bookmarks')}
                accessibilityLabel="Избранное"
              />
              <IconButton
                icon={<Ionicons name="notifications-outline" size={18} color="#fff" />}
                tone="glass"
                size="sm"
                onPress={() => router.push('/feed' as any)}
                accessibilityLabel="Уведомления"
              />
            </View>
          </View>

          <Animated.View entering={FadeInDown.delay(80).springify()} className="mt-7">
            <Text
              className="font-serif text-[14px] italic text-white/70"
              tracking="wide"
            >
              {greetingText}
            </Text>
            <Text
              className="mt-1 font-serif text-[38px] leading-[42px] text-white"
              tracking="tight"
            >
              Забота о здоровье.{'\n'}
              <Text className="font-serif-italic text-white/60">Сегодня.</Text>
            </Text>
            <Text className="mt-3 max-w-[285px] text-[13px] leading-[19px] text-white/62">
              Натуральные средства, курсы и консультации Greenman в одном месте.
            </Text>
          </Animated.View>

          {/* search pill */}
          <AnimatedPressable
            onPress={() => router.push('/catalog')}
            haptic="selection"
            scale={0.98}
            wrapperStyle={shadows.float}
            className="mt-8 flex-row items-center gap-3 rounded-pill bg-white px-5 py-4"
          >
            <Ionicons name="search" size={18} color={greenman[9]} />
            <Text className="flex-1 text-[14px] text-ink-dim">Ромашка, кашель, иммунитет…</Text>
            <View className="h-8 w-8 items-center justify-center rounded-pill bg-ink">
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </AnimatedPressable>
        </LinearGradient>

        <QuickActionsRail
          activeOrder={activeOrder}
          openWA={openWA}
          router={router}
        />

        <HomeStoriesSection stories={stories} router={router} />

        {/* =========== ACTIVE ORDER RAIL =========== */}
        {isAuth && activeOrder ? (
          <View className="mt-8">
            <View className="px-5">
              <Text
                className="text-[10px] font-bold uppercase text-greenman-8"
                tracking="widest"
              >
                Продолжить
              </Text>
              <Text className="mt-1.5 font-serif text-[22px] leading-[26px] text-ink">
                Ваш заказ в пути
              </Text>
            </View>
            <View className="px-5 pt-4">
              <AnimatedPressable
                onPress={() => router.push(`/order/${activeOrder.id}`)}
                scale={0.98}
                haptic="selection"
                wrapperStyle={shadows.card}
                className="overflow-hidden rounded-xl"
              >
                <LinearGradient
                  colors={['#05210f', '#0b2a17']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 22 }}
                >
                  <View className="flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-pill bg-greenman-4" />
                    <Text
                      className="text-[10px] font-bold uppercase text-greenman-3"
                      tracking="widest"
                    >
                      {activeOrder.status}
                    </Text>
                  </View>
                  <View className="mt-3 flex-row items-end justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-[12px] text-white/50">Заказ #{activeOrder.id}</Text>
                      <Text
                        className="mt-1 font-display text-[28px] leading-[32px] text-white"
                        tracking="tight"
                      >
                        {formatPrice(activeOrder.totalPrice, (activeOrder.currency as 'KZT' | 'RUB') ?? currency)}
                      </Text>
                      <Text
                        className="mt-1 text-[12px] text-white/60"
                        numberOfLines={1}
                      >
                        {activeOrder.city}
                        {activeOrder.street ? `, ${activeOrder.street}` : ''}
                      </Text>
                    </View>
                    <View className="h-12 w-12 items-center justify-center rounded-pill bg-white">
                      <Ionicons name="arrow-forward" size={18} color={greenman[9]} />
                    </View>
                  </View>
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </View>
        ) : null}

        {/* =========== DISEASE / CATEGORY CHIPS =========== */}
        {searchPresets.length ? (
          <View className="mt-9">
            <View className="px-5">
              <Text
                className="text-[10px] font-bold uppercase text-clay-5"
                tracking="widest"
              >
                Частые запросы
              </Text>
              <Text className="mt-1.5 font-serif text-[22px] leading-[26px] text-ink">
                С чем боремся?
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: 8 }}
            >
              {searchPresets.map((p, i) => (
                <Chip
                  key={p}
                  label={p}
                  size="md"
                  tone={i % 3 === 0 ? 'clay' : i % 3 === 1 ? 'primary' : 'ink'}
                  onPress={() =>
                    router.push(`/search/disease/${encodeURIComponent(p)}`)
                  }
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* =========== TOP PRODUCTS RAIL =========== */}
        <Section
          eyebrow="Топ продаж"
          title="Что берут чаще всего"
          serif
          action={{ label: 'Всё', onPress: () => router.push('/catalog') }}
          spacing="loose"
          noGutter
          className="px-5"
        >
          {null}
        </Section>
        <View className="mt-1">
          {isLoading ? (
            <ProductRail products={[]} loading size="rail" />
          ) : (
            <ProductRail products={top} size="rail" />
          )}
        </View>

        {/* =========== FEATURE CARD =========== */}
        <View className="mt-10 px-5">
          <AnimatedPressable
            onPress={() => router.push('/social/my-courses')}
            haptic="selection"
            scale={0.98}
            wrapperStyle={shadows.card}
            className="overflow-hidden rounded-2xl"
          >
            <LinearGradient
              colors={[clay[4], clay[5], clay[6]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 26, minHeight: 200 }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  right: -30,
                  top: -20,
                  height: 180,
                  width: 180,
                  borderRadius: 90,
                  backgroundColor: sun[1],
                  opacity: 0.3,
                }}
              />
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-pill bg-white/80" />
                <Text
                  className="text-[10px] font-bold uppercase text-white/90"
                  tracking="widest"
                >
                  Курсы Greenman
                </Text>
              </View>
              <Text
                className="mt-3 font-serif text-[26px] leading-[30px] text-white"
                tracking="tight"
              >
                Забота о здоровье{'\n'}шаг за шагом
              </Text>
              <Text className="mt-3 text-[13px] leading-[18px] text-white/85" numberOfLines={2}>
                Короткие уроки · домашние задания · поддержка
              </Text>
              <View className="mt-5 self-start">
                <Button
                  label="Посмотреть курсы"
                  variant="inverse"
                  size="sm"
                  onPress={() => router.push('/social/my-courses')}
                  iconRight={<Ionicons name="arrow-forward" size={14} color="#0b1a11" />}
                />
              </View>
            </LinearGradient>
          </AnimatedPressable>
        </View>

        {/* =========== WHATSAPP CTA =========== */}
        <View className="mt-12 px-5">
          <AnimatedPressable
            onPress={openWA}
            haptic="light"
            scale={0.98}
            wrapperStyle={shadows.card}
            className="overflow-hidden rounded-2xl bg-ink p-6"
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                right: -30,
                bottom: -40,
                height: 180,
                width: 180,
                borderRadius: 90,
                backgroundColor: greenman[5],
                opacity: 0.25,
              }}
            />
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-pill bg-greenman-5">
                <Ionicons name="logo-whatsapp" size={26} color="#fff" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[10px] font-bold uppercase text-greenman-3"
                  tracking="widest"
                >
                  Бесплатно
                </Text>
                <Text
                  className="mt-1 font-serif text-[20px] leading-[24px] text-white"
                  tracking="tight"
                >
                  Не знаешь, что выбрать?
                </Text>
                <Text className="mt-1 text-[12px] leading-[16px] text-white/60">
                  Задай вопрос нашему травнику
                </Text>
              </View>
              <View className="h-11 w-11 items-center justify-center rounded-pill bg-white">
                <Ionicons name="arrow-forward" size={18} color="#05210f" />
              </View>
            </View>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function QuickTile({
  icon,
  label,
  sub,
  onPress,
  accentBg,
  bg = 'bg-white',
  elevated,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onPress: () => void;
  accentBg: string;
  bg?: string;
  elevated?: boolean;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="selection"
      scale={0.97}
      wrapperStyle={{ width: QUICK_TILE_W, ...(elevated ? shadows.card : shadows.soft) }}
      className={`min-h-[124px] rounded-lg p-4 ${bg}`}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-pill"
        style={{ backgroundColor: accentBg }}
      >
        {icon}
      </View>
      <Text
        className="mt-3 font-bold text-[14px] leading-[18px] text-ink"
        tracking="tight"
      >
        {label}
      </Text>
      <Text className="mt-0.5 text-[11px] text-ink-dim" numberOfLines={1}>
        {sub}
      </Text>
    </AnimatedPressable>
  );
}

function HomeStoriesSection({
  stories,
  router,
}: {
  stories: StoryGroupItem[];
  router: ReturnType<typeof useRouter>;
}) {
  if (!stories.length) return null;
  return (
    <View className="mt-7">
      <View className="flex-row items-end justify-between px-5">
        <View>
          <Text
            className="text-[10px] font-bold uppercase text-greenman-8"
            tracking="widest"
          >
            Сториз
          </Text>
          <Text className="mt-1 font-serif text-[22px] leading-[26px] text-ink">
            Новое от Greenman
          </Text>
        </View>
        <AnimatedPressable onPress={() => router.push('/(tabs)/feed' as any)} haptic="selection">
          <View className="flex-row items-center">
            <Text className="text-[13px] font-bold text-ink" tracking="tight">
              Лента
            </Text>
            <Ionicons name="arrow-forward" size={14} color={greenman.ink} style={{ marginLeft: 4 }} />
          </View>
        </AnimatedPressable>
      </View>
      <View className="mt-2">
        <FeedStoriesRow groups={stories} />
      </View>
    </View>
  );
}

function QuickActionsRail({
  activeOrder,
  openWA,
  router,
}: {
  activeOrder?: { id: number; status: string };
  openWA: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: QUICK_GAP }}
    >
      <QuickTile
        bg="bg-white"
        icon={<Ionicons name="bag-check-outline" size={20} color={greenman[9]} />}
        label="Мои заказы"
        sub={activeOrder ? `#${activeOrder.id} · ${activeOrder.status}` : 'История'}
        onPress={() => router.push('/order/list' as any)}
        accentBg="#e7f3ea"
        elevated
      />
      <QuickTile
        bg="bg-white"
        icon={<Ionicons name="chatbubbles-outline" size={20} color={clay[5]} />}
        label="Консультация"
        sub="WhatsApp"
        onPress={openWA}
        accentBg={clay[0]}
        elevated
      />
      <QuickTile
        bg="bg-sand-1"
        icon={<Ionicons name="bookmark-outline" size={20} color={sand[4]} />}
        label="Сохранённое"
        sub="Посты и статьи"
        onPress={() => router.push('/profile/bookmarks')}
        accentBg="#ebe5d4"
      />
      <QuickTile
        bg="bg-sun-0"
        icon={<Ionicons name="school-outline" size={20} color={sun[3]} />}
        label="Курсы"
        sub="Уроки"
        onPress={() => router.push('/social/my-courses')}
        accentBg="#ffe68a80"
      />
    </ScrollView>
  );
}
