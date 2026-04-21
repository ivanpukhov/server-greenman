import { ScrollView, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useAuthStore } from '@/stores/auth.store';
import { greenman } from '@/theme/colors';

type Tile = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  subtitle?: string;
};

const TILES: Tile[] = [
  { label: 'Посты', icon: 'megaphone-outline', href: '/admin/posts', subtitle: 'Текст + медиа' },
  { label: 'Сторис', icon: 'ellipse-outline', href: '/admin/stories', subtitle: 'Истории 24 ч' },
  { label: 'Reels', icon: 'videocam-outline', href: '/admin/reels', subtitle: 'Короткие видео' },
  { label: 'Статьи', icon: 'document-text-outline', href: '/admin/articles', subtitle: 'С блоками' },
  { label: 'Вебинары', icon: 'easel-outline', href: '/admin/webinars', subtitle: 'Видео + материалы' },
  { label: 'Курсы', icon: 'school-outline', href: '/admin/courses', subtitle: 'С днями' },
  { label: 'Комментарии', icon: 'chatbubbles-outline', href: '/admin/comments', subtitle: 'Модерация' },
  { label: 'Медиа', icon: 'images-outline', href: '/admin/media', subtitle: 'Библиотека' },
  { label: 'Товары', icon: 'leaf-outline', href: '/admin/products', subtitle: 'Описания + фото' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const adminProfile = useAuthStore((s) => s.adminProfile);
  const adminLogout = useAuthStore((s) => s.adminLogout);

  const confirmLogout = () => {
    Alert.alert('Выйти из админки?', 'Пользовательская сессия сохранится.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await adminLogout();
          router.replace('/(tabs)/profile');
        },
      },
    ]);
  };

  return (
    <Screen>
      <Header
        title="Админ-панель"
        onBack={() => router.replace('/(tabs)/profile')}
        rightAction={
          <IconButton
            icon={<Ionicons name="log-out-outline" size={20} color={greenman[7]} />}
            onPress={confirmLogout}
            accessibilityLabel="Выйти из админки"
          />
        }
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        {adminProfile ? (
          <Card variant="tonal" className="mb-5">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <Ionicons name="person-circle-outline" size={22} color={greenman[7]} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink">{adminProfile.fullName}</Text>
                <Text className="text-xs text-ink-dim">ИИН {adminProfile.iin}</Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Text className="mb-3 text-xs font-semibold uppercase text-ink-dim">
          Разделы
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {TILES.map((tile) => (
            <Card
              key={tile.href}
              variant="outline"
              pressable
              onPress={() => router.push(tile.href as any)}
              className="basis-[48%] grow"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-greenman-0">
                  <Ionicons name={tile.icon} size={22} color={greenman[7]} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base font-semibold text-ink"
                    numberOfLines={1}
                  >
                    {tile.label}
                  </Text>
                  {tile.subtitle ? (
                    <Text
                      className="mt-0.5 text-xs text-ink-dim"
                      numberOfLines={2}
                    >
                      {tile.subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          ))}
        </View>

        <View className="mt-8">
          <Button label="Выйти из админки" variant="secondary" onPress={confirmLogout} />
        </View>
      </ScrollView>
    </Screen>
  );
}
