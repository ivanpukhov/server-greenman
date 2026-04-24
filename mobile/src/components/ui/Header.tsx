import { View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { colors } from '@/theme';

type Props = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  hideBack?: boolean;
  rightAction?: ReactNode;
  leftAction?: ReactNode;
  transparent?: boolean;
  scrollOffset?: SharedValue<number>;
  dark?: boolean;
  /**
   * When true, Header applies its own top safe-area inset. Set this if the
   * parent Screen does NOT include the 'top' edge (e.g. screens where content
   * sits under the status bar and the Header sits over it). Transparent mode
   * implies floating.
   */
  floating?: boolean;
};

export function Header({
  title,
  subtitle,
  onBack,
  hideBack,
  rightAction,
  leftAction,
  transparent,
  scrollOffset,
  dark,
  floating,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const padsTop = transparent || floating;

  const bgStyle = useAnimatedStyle(() => {
    if (!transparent || !scrollOffset) return { opacity: 1 };
    const opacity = interpolate(
      scrollOffset.value,
      [0, 80],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const titleStyle = useAnimatedStyle(() => {
    if (!transparent || !scrollOffset) return { opacity: 1 };
    const opacity = interpolate(
      scrollOffset.value,
      [40, 100],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const handleBack = () => {
    Haptics.selectionAsync().catch(() => {});
    if (onBack) onBack();
    else router.back();
  };

  const iconTint = dark ? '#fff' : colors.ink;
  const backBg = dark ? 'bg-white/15' : 'bg-sand-1';

  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingTop: padsTop ? insets.top : 0,
      }}
      className={`${transparent ? 'absolute left-0 right-0 top-0 z-10' : 'relative'}`}
    >
      {transparent ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: '#ffffff',
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            },
            bgStyle,
          ]}
        />
      ) : (
        <View className="border-b border-border bg-white" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      )}

      <View className="h-14 flex-row items-center justify-between px-3">
        <View className="w-11 items-start">
          {hideBack ? (
            leftAction ?? null
          ) : (
            <Pressable
              onPress={handleBack}
              accessibilityLabel="Назад"
              accessibilityRole="button"
              className={`h-10 w-10 items-center justify-center rounded-full ${backBg} active:opacity-70`}
            >
              <Ionicons name="chevron-back" size={22} color={iconTint} />
            </Pressable>
          )}
        </View>

        <View className="flex-1 items-center px-2">
          {transparent && scrollOffset ? (
            <Animated.View style={titleStyle}>
              {title ? (
                <Text
                  numberOfLines={1}
                  className={`text-base font-semibold ${dark ? 'text-white' : 'text-ink'}`}
                >
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text numberOfLines={1} className="text-xs text-ink-dim">
                  {subtitle}
                </Text>
              ) : null}
            </Animated.View>
          ) : (
            <>
              {title ? (
                <Text
                  numberOfLines={1}
                  className={`text-base font-semibold ${dark ? 'text-white' : 'text-ink'}`}
                >
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text numberOfLines={1} className="text-xs text-ink-dim">
                  {subtitle}
                </Text>
              ) : null}
            </>
          )}
        </View>

        <View className="w-11 items-end">{rightAction ?? null}</View>
      </View>
    </View>
  );
}

export { IconButton };
