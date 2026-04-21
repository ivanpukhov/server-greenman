import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, SplashScreen, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider, onlineManager, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { initI18n } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import { useCountryStore } from '@/stores/country.store';

SplashScreen.preventAutoHideAsync().catch(() => {});
initI18n();

export { ErrorBoundary } from '@/components/common/RouteErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  });
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const isReady = useAuthStore((s) => s.isReady);
  const hasChosen = useCountryStore((s) => s.hasChosen);
  const router = useRouter();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    bootstrap().finally(() => setBootstrapped(true));
  }, [bootstrap]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded && isReady && bootstrapped) {
      SplashScreen.hideAsync().catch(() => {});
      if (!hasChosen) {
        router.replace('/country-modal');
      }
    }
  }, [fontsLoaded, isReady, bootstrapped, hasChosen, router]);

  if (!fontsLoaded || !isReady || !bootstrapped) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/phone" />
            <Stack.Screen name="auth/code" />
            <Stack.Screen
              name="country-modal"
              options={{ presentation: 'modal', gestureEnabled: false }}
            />
            <Stack.Screen name="product/[id]" />
            <Stack.Screen name="checkout/index" />
            <Stack.Screen name="order/[id]" />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
            <StatusBar style="dark" />
            <OfflineBanner />
            <Toast />
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
