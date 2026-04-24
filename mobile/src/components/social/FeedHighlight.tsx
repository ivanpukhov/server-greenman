import { View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { clay, sun, greenman } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

cssInterop(LinearGradient, { className: 'style' });

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 32;

type Variant = 'courses' | 'newsletter' | 'community';

type Props = {
  variant?: Variant;
  onPress?: () => void;
};

const VARIANTS: Record<
  Variant,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    icon: keyof typeof Ionicons.glyphMap;
    colors: [string, string, string];
    eyebrowTone: string;
    titleTone: string;
    subTone: string;
    ctaBg: string;
    ctaText: string;
  }
> = {
  courses: {
    eyebrow: 'ОБУЧЕНИЕ',
    title: 'Курсы\nGreenman',
    subtitle: 'Практика ухода за растениями — от основ до тонкостей',
    cta: 'Начать обучение',
    icon: 'leaf',
    colors: [clay[1], clay[3], clay[5]],
    eyebrowTone: 'text-white/80',
    titleTone: 'text-white',
    subTone: 'text-white/85',
    ctaBg: 'bg-white',
    ctaText: 'text-clay-6',
  },
  newsletter: {
    eyebrow: 'ПОДПИСКА',
    title: 'Рассылка\nдля садоводов',
    subtitle: 'Сезонные советы, новинки и личные наблюдения',
    cta: 'Подписаться',
    icon: 'mail',
    colors: [sun[0], sun[1], sun[2]],
    eyebrowTone: 'text-ink/60',
    titleTone: 'text-ink',
    subTone: 'text-ink/70',
    ctaBg: 'bg-ink',
    ctaText: 'text-white',
  },
  community: {
    eyebrow: 'СООБЩЕСТВО',
    title: 'Живое\nрастительное',
    subtitle: 'Задайте вопрос — ответят садоводы Greenman',
    cta: 'Открыть',
    icon: 'chatbubbles',
    colors: ['#0e1a12', greenman[9], greenman[7]],
    eyebrowTone: 'text-white/75',
    titleTone: 'text-white',
    subTone: 'text-white/80',
    ctaBg: 'bg-sun-2',
    ctaText: 'text-ink',
  },
};

export function FeedHighlight({ variant = 'courses', onPress }: Props) {
  const v = VARIANTS[variant];
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="selection"
      wrapperStyle={{ ...shadows.card, width: CARD_W, alignSelf: 'center', marginVertical: 16 }}
    >
      <LinearGradient
        colors={v.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 28, overflow: 'hidden', padding: 24, minHeight: 220 }}
      >
        <View className="flex-row items-start justify-between">
          <Text variant="meta-upper" tracking="widest" className={v.eyebrowTone}>
            {v.eyebrow}
          </Text>
          <View
            className="h-11 w-11 items-center justify-center rounded-pill"
            style={{
              backgroundColor:
                variant === 'newsletter' ? 'rgba(14,26,18,0.08)' : 'rgba(255,255,255,0.15)',
            }}
          >
            <Ionicons
              name={v.icon}
              size={22}
              color={variant === 'newsletter' ? '#0e1a12' : '#ffffff'}
            />
          </View>
        </View>

        <View className="mt-6">
          <Text
            variant="display-serif"
            className={v.titleTone}
            style={{ fontSize: 30, lineHeight: 34 }}
          >
            {v.title}
          </Text>
          <Text variant="body" className={`mt-2 ${v.subTone}`}>
            {v.subtitle}
          </Text>
        </View>

        <View className="mt-5 flex-row items-center">
          <View className={`flex-row items-center rounded-pill ${v.ctaBg} px-5 py-2.5`}>
            <Text className={`text-[13px] font-bold ${v.ctaText}`} tracking="tight">
              {v.cta}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={15}
              color={v.ctaText.includes('white') ? '#ffffff' : v.ctaText.includes('clay') ? clay[6] : '#0e1a12'}
              style={{ marginLeft: 6 }}
            />
          </View>
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}
