import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

export default function AdminLayout() {
  const router = useRouter();
  const segments = useSegments();
  const isReady = useAuthStore((s) => s.isReady);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  useEffect(() => {
    if (!isReady) return;
    const inAuthScreens =
      segments[1] === 'login' || segments[1] === 'code';
    if (!isAdmin && !inAuthScreens) {
      router.replace('/admin/login');
    }
  }, [isReady, isAdmin, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="code" />
      <Stack.Screen name="index" />
      <Stack.Screen name="posts/index" />
      <Stack.Screen name="posts/[id]" />
      <Stack.Screen name="stories/index" />
      <Stack.Screen name="stories/[id]" />
      <Stack.Screen name="reels/index" />
      <Stack.Screen name="reels/[id]" />
      <Stack.Screen name="articles/index" />
      <Stack.Screen name="articles/[id]" />
      <Stack.Screen name="webinars/index" />
      <Stack.Screen name="webinars/[id]" />
      <Stack.Screen name="courses/index" />
      <Stack.Screen name="courses/[id]/index" />
      <Stack.Screen name="courses/[id]/days/[dayId]" />
      <Stack.Screen name="comments/index" />
      <Stack.Screen name="media/index" />
      <Stack.Screen name="products/index" />
      <Stack.Screen name="products/[id]" />
    </Stack>
  );
}
