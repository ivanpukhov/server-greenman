import { View } from 'react-native';
import { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { AnimatedPressable } from './AnimatedPressable';
import { greenman } from '@/theme/colors';

type Spacing = 'tight' | 'normal' | 'loose';

type Props = {
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  serif?: boolean;
  action?: { label: string; onPress: () => void };
  spacing?: Spacing;
  noGutter?: boolean;
  children: ReactNode;
  className?: string;
  eyebrowTone?: 'accent' | 'clay' | 'sun' | 'ink';
};

const spacings: Record<Spacing, string> = {
  tight: 'mt-7',
  normal: 'mt-10',
  loose: 'mt-14',
};

const eyebrowTones: Record<NonNullable<Props['eyebrowTone']>, string> = {
  accent: 'text-greenman-8',
  clay: 'text-clay-5',
  sun: 'text-sun-3',
  ink: 'text-ink',
};

export function Section({
  title,
  eyebrow,
  subtitle,
  serif,
  action,
  spacing = 'normal',
  noGutter,
  children,
  className,
  eyebrowTone = 'accent',
}: Props) {
  const titleCls = serif
    ? 'font-serif text-[30px] leading-[34px] text-ink'
    : 'font-display text-[26px] leading-[30px] text-ink';
  return (
    <View className={`${spacings[spacing]} ${noGutter ? '' : 'px-5'} ${className ?? ''}`}>
      {(title || eyebrow || action) && (
        <View className="flex-row items-end justify-between">
          <View className="flex-1 pr-3">
            {eyebrow ? (
              <Text
                className={`text-[10px] font-bold uppercase mb-1.5 ${eyebrowTones[eyebrowTone]}`}
                tracking="widest"
              >
                {eyebrow}
              </Text>
            ) : null}
            {title ? (
              <Text className={titleCls} numberOfLines={2} tracking="tight">
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text className="mt-2 text-[14px] leading-[20px] text-ink-dim">{subtitle}</Text>
            ) : null}
          </View>
          {action ? (
            <AnimatedPressable
              onPress={action.onPress}
              haptic="selection"
              scale={0.94}
              className="flex-row items-center gap-1"
            >
              <Text className="text-[13px] font-bold text-greenman-8">{action.label}</Text>
              <Ionicons name="arrow-forward" size={15} color={greenman[8]} />
            </AnimatedPressable>
          ) : null}
        </View>
      )}
      <View className={title || eyebrow || action ? 'mt-5' : ''}>{children}</View>
    </View>
  );
}
