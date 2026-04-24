import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, SplashScreen, useRouter, useSegments } from 'expo-router';
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
import {
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_600SemiBold,
} from '@expo-google-fonts/source-serif-4';
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
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
  });
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const isReady = useAuthStore((s) => s.isReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const requiresProfile = useAuthStore((s) => s.requiresProfile);
  const hasChosen = useCountryStore((s) => s.hasChosen);
  const router = useRouter();
  const segments = useSegments();
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
      } else if (isAuthenticated && requiresProfile && segments.join('/') !== 'auth/profile') {
        router.replace('/auth/profile');
      }
    }
  }, [fontsLoaded, isReady, bootstrapped, hasChosen, isAuthenticated, requiresProfile, segments, router]);

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
            <Stack.Screen name="auth/profile" options={{ gestureEnabled: false }} />
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
