import { forwardRef, useCallback, useMemo, ReactNode } from 'react';
import { View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Text } from './Text';

type Props = {
  title?: string;
  subtitle?: string;
  snapPoints?: (number | string)[];
  scrollable?: boolean;
  onDismiss?: () => void;
  children: ReactNode;
};

export const Sheet = forwardRef<BottomSheetModal, Props>(function Sheet(
  { title, subtitle, snapPoints, scrollable, onDismiss, children },
  ref
) {
  const points = useMemo(() => snapPoints ?? ['60%'], [snapPoints]);

  const renderBackdrop = useCallback(
    // @ts-expect-error — gorhom props typing
    (p) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />,
    []
  );

  const header =
    title || subtitle ? (
      <View className="px-5 pb-3 pt-1">
        {title ? <Text className="text-xl font-display text-ink">{title}</Text> : null}
        {subtitle ? <Text className="mt-1 text-sm text-ink-dim">{subtitle}</Text> : null}
      </View>
    ) : null;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={points}
      backdropComponent={renderBackdrop}
      onDismiss={onDismiss}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: '#cfd8cf', width: 40 }}
      backgroundStyle={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
    >
      {scrollable ? (
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {header}
          <View className="px-5">{children}</View>
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView>
          {header}
          <View className="px-5 pb-8">{children}</View>
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
});
