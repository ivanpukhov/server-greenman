import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import { semantic, greenman } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { getJSON, setJSON } from '@/lib/storage/mmkv';

const RECENT_KEY = 'gm.search.recent';
const MAX_RECENT = 8;

type Kind = 'all' | 'article' | 'post' | 'reel' | 'webinar' | 'course';

const TABS: { key: Kind; label: string }[] = [
  { key: 'all', label: 'Всё' },
  { key: 'article', label: 'Статьи' },
  { key: 'post', label: 'Посты' },
  { key: 'reel', label: 'Reels' },
  { key: 'webinar', label: 'Вебинары' },
  { key: 'course', label: 'Курсы' },
];

type SearchItem = {
  id: string;
  kind: Exclude<Kind, 'all'>;
  entityId: number;
  title?: string;
  slug?: string;
  excerpt?: string;
  text?: string;
  description?: string;
  publishedAt?: string;
  cover?: { url?: string | null; blurhash?: string | null } | null;
  engagement?: { likes: number; comments: number; bookmarks: number };
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>(() => getJSON<string[]>(RECENT_KEY) ?? []);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const runSearch = useCallback(
    async (query: string, selKind: Kind) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = (await socialApi.search({
          q: trimmed,
          kind: selKind === 'all' ? undefined : selKind,
          limit: 15,
        })) as { items: SearchItem[]; total: number };
        setItems(Array.isArray(res?.items) ? res.items : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q, kind), 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, kind, runSearch]);

  const commitRecent = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      const next = [trimmed, ...recents.filter((r) => r !== trimmed)].slice(0, MAX_RECENT);
      setRecents(next);
      setJSON(RECENT_KEY, next);
    },
    [recents]
  );

  const clearRecents = () => {
    setRecents([]);
    setJSON(RECENT_KEY, []);
  };

  const openItem = useCallback(
    (it: SearchItem) => {
      commitRecent(q);
      Keyboard.dismiss();
      if (it.kind === 'article' && it.slug) router.push(`/social/article/${it.slug}`);
      else if (it.kind === 'webinar' && it.slug) router.push(`/social/webinar/${it.slug}`);
      else if (it.kind === 'course' && it.slug) router.push(`/social/course/${it.slug}`);
      else if (it.kind === 'post') router.push(`/social/post/${it.entityId}`);
      else if (it.kind === 'reel') router.push('/reels');
    },
    [commitRecent, q]
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchItem }) => <SearchResult item={item} onPress={() => openItem(item)} />,
    [openItem]
  );

  const showRecents = !q.trim();
  const discoverable = useMemo(() => TABS, []);

  return (
    <View style={{ flex: 1, backgroundColor: semantic.surface }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          paddingTop: insets.top + spacing.xs,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xs,
          backgroundColor: semantic.surface,
          borderBottomWidth: 1,
          borderBottomColor: semantic.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/feed'))}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={24} color={semantic.ink} />
          </Pressable>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: semantic.surfaceSunken,
              borderRadius: radii.full,
              paddingHorizontal: spacing.sm,
              height: 40,
              gap: spacing.xs,
            }}
          >
            <Ionicons name="search" size={18} color={semantic.inkMuted} />
            <TextInput
              ref={inputRef}
              value={q}
              onChangeText={setQ}
              placeholder="Поиск"
              placeholderTextColor={semantic.inkMuted}
              returnKeyType="search"
              onSubmitEditing={() => commitRecent(q)}
              style={{
                flex: 1,
                fontFamily: 'Manrope_500Medium',
                fontSize: 15,
                color: semantic.ink,
                paddingVertical: 0,
              }}
            />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Очистить">
                <Ionicons name="close-circle" size={18} color={semantic.inkMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <FlatList
          data={discoverable}
          keyExtractor={(t) => t.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: spacing.xs }}
          contentContainerStyle={{ gap: spacing.xs, paddingVertical: 4 }}
          renderItem={({ item }) => {
            const active = kind === item.key;
            return (
              <Pressable
                onPress={() => setKind(item.key)}
                accessibilityRole="button"
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: 6,
                  borderRadius: radii.full,
                  backgroundColor: active ? greenman[7] : semantic.surfaceSunken,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Manrope_600SemiBold',
                    fontSize: 13,
                    color: active ? '#fff' : semantic.ink,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {showRecents ? (
        <View style={{ flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
          {recents.length > 0 ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.xs,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Manrope_600SemiBold',
                    fontSize: 14,
                    color: semantic.inkDim,
                  }}
                >
                  Недавние запросы
                </Text>
                <Pressable onPress={clearRecents} hitSlop={8}>
                  <Text
                    style={{
                      fontFamily: 'Manrope_500Medium',
                      fontSize: 13,
                      color: greenman[7],
                    }}
                  >
                    Очистить
                  </Text>
                </Pressable>
              </View>
              {recents.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setQ(r)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing.sm,
                    gap: spacing.sm,
                  }}
                >
                  <Ionicons name="time-outline" size={18} color={semantic.inkMuted} />
                  <Text style={{ flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 15 }}>
                    {r}
                  </Text>
                  <Pressable
                    hitSlop={10}
                    onPress={() => {
                      const next = recents.filter((x) => x !== r);
                      setRecents(next);
                      setJSON(RECENT_KEY, next);
                    }}
                  >
                    <Ionicons name="close" size={18} color={semantic.inkMuted} />
                  </Pressable>
                </Pressable>
              ))}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: spacing['2xl'] }}>
              <Ionicons name="search-outline" size={40} color={semantic.inkMuted} />
              <Text
                style={{
                  marginTop: spacing.sm,
                  fontFamily: 'Manrope_500Medium',
                  color: semantic.inkDim,
                }}
              >
                Начните вводить запрос
              </Text>
            </View>
          )}
        </View>
      ) : loading ? (
        <View style={{ paddingTop: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator color={greenman[7]} />
        </View>
      ) : items.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: spacing['2xl'] }}>
          <Ionicons name="file-tray-outline" size={40} color={semantic.inkMuted} />
          <Text
            style={{
              marginTop: spacing.sm,
              fontFamily: 'Manrope_500Medium',
              color: semantic.inkDim,
            }}
          >
            Ничего не найдено
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: spacing.xs }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: semantic.border, marginLeft: 92 }} />
          )}
        />
      )}
    </View>
  );
}

function SearchResult({ item, onPress }: { item: SearchItem; onPress: () => void }) {
  const kindLabel =
    item.kind === 'article'
      ? 'Статья'
      : item.kind === 'post'
      ? 'Пост'
      : item.kind === 'reel'
      ? 'Reel'
      : item.kind === 'webinar'
      ? 'Вебинар'
      : 'Курс';
  const title = item.title ?? item.text ?? item.excerpt ?? item.description ?? '';
  const subtitle = item.excerpt ?? item.description ?? item.text ?? '';
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radii.md,
          overflow: 'hidden',
          backgroundColor: semantic.surfaceSunken,
        }}
      >
        {item.cover?.url ? (
          <Image
            source={{ uri: item.cover.url }}
            placeholder={item.cover.blurhash ? { blurhash: item.cover.blurhash } : undefined}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name={
                item.kind === 'reel'
                  ? 'videocam'
                  : item.kind === 'webinar'
                  ? 'play'
                  : item.kind === 'course'
                  ? 'school'
                  : 'document-text'
              }
              size={22}
              color={semantic.inkMuted}
            />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: 'Manrope_500Medium',
            fontSize: 11,
            color: greenman[7],
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          {kindLabel}
        </Text>
        <Text
          style={{
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 15,
            color: semantic.ink,
            marginTop: 2,
          }}
          numberOfLines={2}
        >
          {title || '—'}
        </Text>
        {subtitle && subtitle !== title ? (
          <Text
            style={{
              fontFamily: 'Manrope_400Regular',
              fontSize: 13,
              color: semantic.inkDim,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
