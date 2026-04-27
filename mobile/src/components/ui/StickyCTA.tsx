import { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
import { shadows } from '@/theme/shadows';

cssInterop(View, { className: 'style' });

type Props = {
  children: ReactNode;
  topSlot?: ReactNode;
  bottomOffset?: number;
  className?: string;
  contentClassName?: string;
};

export function StickyCTA({
  children,
  topSlot,
  bottomOffset = 0,
  className,
  contentClassName,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{ bottom: bottomOffset, ...shadows.float }}
      className={`absolute left-0 right-0 border-t border-border bg-white px-4 pt-3 ${className ?? ''}`}
    >
      <View
        className={contentClassName}
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {topSlot ? <View className="mb-2">{topSlot}</View> : null}
        {children}
      </View>
    </View>
  );
}
