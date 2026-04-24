import { ScrollView, View, Alert, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { greenman, semantic } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import {
  useAdminStats,
  useAdminDrafts,
  type DraftItem,
  type DraftKind,
} from '@/hooks/admin/useAdminDashboard';
import { formatRelativeRu } from '@/lib/format/relativeTime';

type QuickAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Новый пост', icon: 'add-circle-outline', href: '/admin/posts/new' },
  { label: 'Новый баннер', icon: 'albums-outline', href: '/admin/banners/new' },
  { label: 'Новая статья', icon: 'create-outline', href: '/admin/articles/new' },
  { label: 'Новая сторис', icon: 'ellipse-outline', href: '/admin/stories/new' },
];

type SectionTile = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  count?: number;
  draftCount?: number;
};

function draftHref(item: DraftItem): string {
  switch (item.kind) {
    case 'post':
      return `/admin/posts/${item.id}`;
    case 'article':
      return `/admin/articles/${item.id}`;
    case 'reel':
      return `/admin/reels/${item.id}`;
    case 'webinar':
      return `/admin/webinars/${item.id}`;
    case 'course':
      return `/admin/courses/${item.id}`;
  }
}

const KIND_LABEL: Record<DraftKind, string> = {
  post: 'Пост',
  article: 'Статья',
  reel: 'Reel',
  webinar: 'Вебинар',
  course: 'Курс',
};

const KIND_ICON: Record<DraftKind, keyof typeof Ionicons.glyphMap> = {
  post: 'megaphone-outline',
  article: 'document-text-outline',
  reel: 'videocam-outline',
  webinar: 'easel-outline',
  course: 'school-outline',
};

export default function AdminDashboard() {
  const router = useRouter();
  const adminProfile = useAuthStore((s) => s.adminProfile);
  const adminLogout = useAuthStore((s) => s.adminLogout);
  const stats = useAdminStats();
  const drafts = useAdminDrafts(8);

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

  const s = stats.data;
  const sections: SectionTile[] = [
    {
      label: 'Посты',
      icon: 'megaphone-outline',
      href: '/admin/posts',
      count: s?.posts?.total,
      draftCount: s?.posts?.draft,
    },
    {
      label: 'Статьи',
      icon: 'document-text-outline',
      href: '/admin/articles',
      count: s?.articles?.total,
      draftCount: s?.articles?.draft,
    },
    {
      label: 'Reels',
      icon: 'videocam-outline',
      href: '/admin/reels',
      count: s?.reels?.total,
      draftCount: s?.reels?.draft,
    },
    {
      label: 'Сторис',
      icon: 'ellipse-outline',
      href: '/admin/stories',
      count: s?.stories?.total,
    },
    {
      label: 'Баннеры',
      icon: 'albums-outline',
      href: '/admin/banners',
      count: s?.banners?.total,
    },
    {
      label: 'Вебинары',
      icon: 'easel-outline',
      href: '/admin/webinars',
      count: s?.webinars?.total,
      draftCount: s?.webinars?.draft,
    },
    {
      label: 'Курсы',
      icon: 'school-outline',
      href: '/admin/courses',
      count: s?.courses?.total,
      draftCount: s?.courses?.draft,
    },
    {
      label: 'Комментарии',
      icon: 'chatbubbles-outline',
      href: '/admin/comments',
      count: s?.comments?.total,
    },
    {
      label: 'Медиа',
      icon: 'images-outline',
      href: '/admin/media',
      count: s?.media?.total,
    },
    {
      label: 'Товары',
      icon: 'leaf-outline',
      href: '/admin/products',
    },
  ];

  const refreshing = stats.isRefetching || drafts.isRefetching;
  const onRefresh = () => {
    stats.refetch();
    drafts.refetch();
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
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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

        {s ? (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              marginBottom: spacing.lg,
            }}
          >
            <StatTile label="Студенты" value={s.enrollments?.active ?? 0} />
            <StatTile label="Курсы" value={s.courses?.total ?? 0} />
            <StatTile label="Комментарии" value={s.comments?.total ?? 0} />
          </View>
        ) : stats.isLoading ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            <Skeleton className="h-20 flex-1 rounded-2xl" />
            <Skeleton className="h-20 flex-1 rounded-2xl" />
            <Skeleton className="h-20 flex-1 rounded-2xl" />
          </View>
        ) : null}

        <SectionHeader title="Быстрые действия" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {QUICK_ACTIONS.map((q) => (
            <Pressable
              key={q.href}
              onPress={() => router.push(q.href as never)}
              style={{
                flexBasis: '48%',
                flexGrow: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: radii.lg,
                backgroundColor: greenman[0],
                borderWidth: 1,
                borderColor: greenman[2],
              }}
            >
              <Ionicons name={q.icon} size={20} color={greenman[7]} />
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: greenman[8] }}>
                {q.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader title="Черновики" style={{ marginTop: spacing.xl }} />
        {drafts.isLoading ? (
          <View style={{ gap: spacing.xs }}>
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </View>
        ) : (drafts.data ?? []).length === 0 ? (
          <Text
            style={{
              fontFamily: 'Manrope_500Medium',
              fontSize: 13,
              color: semantic.inkDim,
              paddingVertical: spacing.sm,
            }}
          >
            Черновиков нет — всё опубликовано.
          </Text>
        ) : (
          <View style={{ gap: spacing.xs }}>
            {(drafts.data ?? []).map((d) => (
              <Pressable
                key={`${d.kind}-${d.id}`}
                onPress={() => router.push(draftHref(d) as never)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.sm,
                  borderRadius: radii.md,
                  backgroundColor: semantic.surface,
                  borderWidth: 1,
                  borderColor: semantic.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.md,
                    backgroundColor: greenman[0],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={KIND_ICON[d.kind]} size={18} color={greenman[7]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: 'Manrope_600SemiBold',
                      fontSize: 14,
                      color: semantic.ink,
                    }}
                  >
                    {d.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Manrope_500Medium',
                      fontSize: 11,
                      color: semantic.inkDim,
                      marginTop: 2,
                    }}
                  >
                    {KIND_LABEL[d.kind]} · {formatRelativeRu(d.updatedAt)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={semantic.inkMuted} />
              </Pressable>
            ))}
          </View>
        )}

        <SectionHeader title="Разделы" style={{ marginTop: spacing.xl }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {sections.map((tile) => (
            <Pressable
              key={tile.href}
              onPress={() => router.push(tile.href as never)}
              style={{
                flexBasis: '48%',
                flexGrow: 1,
                padding: spacing.md,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: semantic.border,
                backgroundColor: semantic.surface,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.md,
                    backgroundColor: greenman[0],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={tile.icon} size={18} color={greenman[7]} />
                </View>
                <Text
                  style={{
                    fontFamily: 'Manrope_600SemiBold',
                    fontSize: 14,
                    color: semantic.ink,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {tile.label}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={{
                    fontFamily: 'Manrope_700Bold',
                    fontSize: 20,
                    color: semantic.ink,
                  }}
                >
                  {tile.count ?? '—'}
                </Text>
                {tile.draftCount ? (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: radii.full,
                      backgroundColor: '#FEF0DB',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Manrope_600SemiBold',
                        fontSize: 10,
                        color: '#8A5A10',
                      }}
                    >
                      {tile.draftCount} черн.
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{
        flex: 1,
        padding: spacing.md,
        borderRadius: radii.lg,
        backgroundColor: greenman[0],
        borderWidth: 1,
        borderColor: greenman[2],
      }}
    >
      <Text
        style={{
          fontFamily: 'Manrope_800ExtraBold',
          fontSize: 24,
          color: greenman[8],
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: 'Manrope_500Medium',
          fontSize: 11,
          color: greenman[7],
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  style,
}: {
  title: string;
  style?: { marginTop?: number };
}) {
  return (
    <Text
      style={{
        fontFamily: 'Manrope_600SemiBold',
        fontSize: 11,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: semantic.inkDim,
        marginBottom: spacing.sm,
        ...style,
      }}
    >
      {title}
    </Text>
  );
}
