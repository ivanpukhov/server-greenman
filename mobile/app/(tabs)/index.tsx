import { useState } from 'react';
import { ScrollView, View, RefreshControl, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Section } from '@/components/ui/Section';
import { IconButton } from '@/components/ui/IconButton';
import { ProductGrid, ProductGridSkeleton } from '@/components/product/ProductGrid';
import { SearchBlock } from '@/components/product/SearchBlock';
import { useProducts } from '@/hooks/useProducts';
import { useCountryStore } from '@/stores/country.store';
import { colors, greenman } from '@/theme/colors';

const WHATSAPP_URL = 'https://wa.me/77001234567';

type FaqItem = { q: string; a: string };
type TrustKey = 'natural' | 'delivery' | 'consult' | 'quality';
type Testimonial = { quote: string; author: string; city: string };
type Step = { title: string; text: string };
type StatItem = { value: string; label: string };

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: products, isLoading, refetch, isRefetching } = useProducts();
  const country = useCountryStore((s) => s.country);

  const faqItems = (t('main.faq.items', { returnObjects: true }) as FaqItem[]) ?? [];
  const trustKeys: TrustKey[] = ['natural', 'delivery', 'consult', 'quality'];
  const testimonials = (t('main.testimonials.items', { returnObjects: true }) as Testimonial[]) ?? [];
  const steps = (t('main.how_it_works.steps', { returnObjects: true }) as Step[]) ?? [];
  const searchPresets = (t('main.search_presets.items', { returnObjects: true }) as string[]) ?? [];
  const topProducts = (products ?? []).slice(0, 6);

  const stats: StatItem[] = [
    t('main.stats.clients', { returnObjects: true }) as StatItem,
    t('main.stats.years', { returnObjects: true }) as StatItem,
    t('main.stats.countries', { returnObjects: true }) as StatItem,
  ];

  const openWhatsApp = () => {
    Haptics.selectionAsync().catch(() => {});
    Linking.openURL(WHATSAPP_URL).catch(() => {});
  };

  const goSearchPreset = (disease: string) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(`/search/disease/${encodeURIComponent(disease)}`);
  };

  return (
    <Screen edges={['left', 'right']}>
      {/* Simple header */}
      <View
        style={{ paddingTop: insets.top }}
        className="border-b border-border bg-white"
      >
        <View className="h-12 flex-row items-center justify-between px-4">
          <View className="flex-row items-center gap-2">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-greenman-7">
              <Ionicons name="leaf" size={14} color="#fff" />
            </View>
            <Text className="text-base font-display text-ink">GreenMan</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <IconButton
              icon={<Text className="text-base">{country === 'KZ' ? '🇰🇿' : '🇷🇺'}</Text>}
              variant="tonal"
              size="sm"
              onPress={() => router.push('/country-modal')}
              accessibilityLabel="Сменить страну"
            />
            <IconButton
              icon={<Ionicons name="search" size={18} color={colors.ink} />}
              variant="tonal"
              size="sm"
              onPress={() => router.push('/catalog')}
              accessibilityLabel="Поиск"
            />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={greenman[6]} />
        }
        removeClippedSubviews
      >
        {/* HERO — compact */}
        <View className="px-5 pt-4">
          <View
            className="overflow-hidden rounded-xl p-5"
            style={{ backgroundColor: greenman[8] }}
          >
            <Text
              className="text-[11px] font-semibold uppercase text-greenman-1"
              style={{ letterSpacing: 1 }}
            >
              {t('main.hero.eyebrow')}
            </Text>
            <Text className="mt-2 text-2xl font-display leading-tight text-white">
              {t('main.hero.title')}
            </Text>
            <Text className="mt-2 text-[13px] leading-5 text-greenman-1" numberOfLines={3}>
              {t('main.hero.subtitle')}
            </Text>
            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  router.push('/catalog');
                }}
                className="h-12 flex-1 flex-row items-center justify-center rounded-xl bg-white px-4 active:opacity-80"
              >
                <Text className="text-base font-bold text-greenman-8">
                  {t('main.hero.cta_catalog')}
                </Text>
              </Pressable>
              <Pressable
                onPress={openWhatsApp}
                className="h-12 flex-row items-center justify-center rounded-xl bg-white/15 px-4 active:opacity-80"
              >
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* TRUST ROW */}
        <View className="mt-6">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          >
            {trustKeys.map((k) => (
              <TrustCard
                key={k}
                icon={iconFor(k)}
                title={t(`main.trust.${k}.title`)}
                text={t(`main.trust.${k}.text`)}
              />
            ))}
          </ScrollView>
        </View>

        {/* SEARCH */}
        <Section title={t('main.search_block.title')} subtitle={t('main.search_block.subtitle')}>
          <SearchBlock />
          {searchPresets.length ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {searchPresets.map((preset) => (
                <Chip
                  key={preset}
                  label={preset}
                  size="sm"
                  onPress={() => goSearchPreset(preset)}
                />
              ))}
            </View>
          ) : null}
        </Section>

        {/* TOP PRODUCTS */}
        <Section
          title={t('main.top.title')}
          subtitle={t('main.top.subtitle')}
          action={{ label: t('main.top.see_all'), onPress: () => router.push('/catalog') }}
        >
          {isLoading ? (
            <ProductGridSkeleton rows={2} />
          ) : topProducts.length ? (
            <ProductGrid products={topProducts} />
          ) : (
            <Text className="text-sm text-ink-dim">Каталог пока пуст.</Text>
          )}
        </Section>

        {/* STATS */}
        <View className="mt-8 px-5">
          <View className="flex-row gap-2">
            {stats.map((s, idx) => (
              <View
                key={idx}
                className="flex-1 items-center rounded-xl bg-greenman-0 px-2 py-3"
              >
                <Text className="text-base font-display text-greenman-8">{s.value}</Text>
                <Text
                  className="mt-1 text-center text-[10px] leading-4 text-ink-dim"
                  numberOfLines={2}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* TESTIMONIALS — single static card (faster than carousel) */}
        {testimonials[0] ? (
          <Section
            title={t('main.testimonials.title')}
            subtitle={t('main.testimonials.subtitle')}
          >
            <View className="rounded-xl border border-border bg-white p-4">
              <Ionicons name="chatbox" size={16} color={greenman[6]} />
              <Text className="mt-2 text-sm leading-5 text-ink">"{testimonials[0].quote}"</Text>
              <View className="mt-3 flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-greenman-0">
                  <Text className="text-sm font-display text-greenman-8">
                    {testimonials[0].author.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text className="text-sm font-semibold text-ink">{testimonials[0].author}</Text>
                  <Text className="text-[11px] text-ink-dim">{testimonials[0].city}</Text>
                </View>
              </View>
            </View>
          </Section>
        ) : null}

        {/* HOW IT WORKS */}
        <Section title={t('main.how_it_works.title')} subtitle={t('main.how_it_works.subtitle')}>
          <View className="gap-2">
            {steps.map((s, idx) => (
              <View
                key={idx}
                className="flex-row items-start gap-3 rounded-xl border border-border bg-white p-3"
              >
                <View className="h-8 w-8 items-center justify-center rounded-full bg-greenman-7">
                  <Text className="text-sm font-bold text-white">{idx + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-ink">{s.title}</Text>
                  <Text className="mt-0.5 text-xs leading-4 text-ink-dim">{s.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        {/* ABOUT */}
        <View className="mt-8 px-5">
          <Card variant="tonal" padded>
            <Text
              className="text-[11px] font-semibold uppercase text-greenman-8"
              style={{ letterSpacing: 1 }}
            >
              {t('main.about.eyebrow')}
            </Text>
            <Text className="mt-1 text-xl font-display text-ink">
              {t('main.about.title')}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-ink-dim">
              {t('main.about.text')}
            </Text>
          </Card>
        </View>

        {/* FAQ */}
        <Section title={t('main.faq.title')} subtitle={t('main.faq.subtitle')}>
          <View className="gap-2">
            {faqItems?.map((item, idx) => <FaqRow key={idx} {...item} />)}
          </View>
        </Section>

        {/* WHATSAPP BANNER */}
        <View className="mt-8 px-5">
          <View className="rounded-xl bg-greenman-0 p-5">
            <Text
              className="text-[11px] font-semibold uppercase text-greenman-8"
              style={{ letterSpacing: 1 }}
            >
              {t('banner.eyebrow')}
            </Text>
            <Text className="mt-1 text-lg font-display text-ink">{t('banner.title')}</Text>
            <Text className="mt-2 text-sm text-ink-dim">{t('banner.subtitle')}</Text>
            <View className="mt-3 self-start">
              <Button label={t('banner.whatsapp')} onPress={openWhatsApp} />
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View className="mt-8 px-5 pb-4">
          <Text className="text-xs text-ink-dim">
            {t('main.footer.copyright', { year: new Date().getFullYear() })}
          </Text>
          <Text className="mt-2 text-[11px] leading-4 text-ink-dim">
            {t('main.footer.disclaimer')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function iconFor(key: TrustKey): string {
  switch (key) {
    case 'natural':
      return 'leaf-outline';
    case 'delivery':
      return 'cube-outline';
    case 'consult':
      return 'chatbubbles-outline';
    case 'quality':
      return 'videocam-outline';
  }
}

function TrustCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <View
      className="rounded-xl border border-border bg-white p-3"
      style={{ width: 180 }}
    >
      <View className="h-8 w-8 items-center justify-center rounded-full bg-greenman-0">
        <Ionicons name={icon as never} size={16} color={greenman[8]} />
      </View>
      <Text className="mt-2 text-sm font-semibold text-ink" numberOfLines={2}>
        {title}
      </Text>
      <Text className="mt-1 text-[11px] leading-4 text-ink-dim" numberOfLines={3}>
        {text}
      </Text>
    </View>
  );
}

function FaqRow({ q, a }: FaqItem) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      className="rounded-xl border border-border bg-white p-3 active:opacity-90"
    >
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-sm font-semibold text-ink">{q}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={greenman[7]}
        />
      </View>
      {open ? <Text className="mt-2 text-xs leading-4 text-ink-dim">{a}</Text> : null}
    </Pressable>
  );
}
