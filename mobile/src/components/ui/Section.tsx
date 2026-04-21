import { Pressable, View } from 'react-native';
import { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { colors } from '@/theme';

type Spacing = 'tight' | 'normal' | 'loose';

type Props = {
  title?: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  spacing?: Spacing;
  noGutter?: boolean;
  children: ReactNode;
  className?: string;
};

const spacings: Record<Spacing, string> = {
  tight: 'mt-6',
  normal: 'mt-10',
  loose: 'mt-14',
};

export function Section({
  title,
  subtitle,
  action,
  spacing = 'normal',
  noGutter,
  children,
  className,
}: Props) {
  return (
    <View className={`${spacings[spacing]} ${noGutter ? '' : 'px-5'} ${className ?? ''}`}>
      {(title || action) && (
        <View className="flex-row items-end justify-between">
          <View className="flex-1 pr-3">
            {title ? (
              <Text className="text-2xl font-display text-ink" numberOfLines={2}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text className="mt-1 text-sm text-ink-dim">{subtitle}</Text>
            ) : null}
          </View>
          {action ? (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                action.onPress();
              }}
              className="flex-row items-center active:opacity-70"
            >
              <Text className="text-sm font-semibold text-greenman-7">{action.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
            </Pressable>
          ) : null}
        </View>
      )}
      <View className={title || action ? 'mt-4' : ''}>{children}</View>
    </View>
  );
}
