import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { Text } from '@/components/ui/Text';

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected !== false && state.isInternetReachable !== false;
      setOnline(isOnline);
    });
    return () => unsub();
  }, []);

  if (online) return null;

  return (
    <View
      style={{ paddingTop: insets.top + 8 }}
      className="absolute left-0 right-0 top-0 z-50 items-center bg-red-500 pb-2"
    >
      <Text className="text-xs font-semibold text-white">Нет соединения с интернетом</Text>
    </View>
  );
}
