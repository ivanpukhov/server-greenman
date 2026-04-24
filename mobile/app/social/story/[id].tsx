import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  Dimensions,
  FlatList,
  type ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { socialApi } from '@/features/social/api';
import { spacing } from '@/theme/spacing';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Story = {
  id: number;
  adminUserId: number;
  caption?: string | null;
  durationSec?: number;
  media?: { url?: string | null; type?: 'image' | 'video'; blurhash?: string | null } | null;
};

type Group = { id?: string; categorySlug?: string; categoryTitle?: string; adminUserId: number; stories: Story[] };

export default function StoryScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupIdx, setGroupIdx] = useState(0);
  const pagerRef = useRef<FlatList<Group>>(null);

  useEffect(() => {
    socialApi.stories
      .active()
      .then((g) => {
        const arr = (Array.isArray(g) ? g : []) as Group[];
        setGroups(arr);
        const targetGi = arr.findIndex((grp) =>
          grp.stories.some((s) => String(s.id) === String(id))
        );
        if (targetGi >= 0) {
          setGroupIdx(targetGi);
          setTimeout(() => {
            pagerRef.current?.scrollToIndex({ index: targetGi, animated: false });
          }, 0);
        }
      })
      .catch(() => {});
  }, [id]);

  const onViewable = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems?.[0]?.index;
      if (typeof first === 'number') setGroupIdx(first);
    },
    []
  );

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/feed');
  };

  const advanceGroup = useCallback(() => {
    if (groupIdx + 1 < groups.length) {
      pagerRef.current?.scrollToIndex({ index: groupIdx + 1, animated: true });
    } else {
      close();
    }
  }, [groupIdx, groups.length]);

  const reverseGroup = useCallback(() => {
    if (groupIdx > 0) {
      pagerRef.current?.scrollToIndex({ index: groupIdx - 1, animated: true });
    }
  }, [groupIdx]);

  if (!groups.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" />
        <Text style={{ color: 'rgba(255,255,255,0.6)' }}>Загрузка…</Text>
      </View>
    );
  }

  const targetIdInGroup = groups[groupIdx]?.stories.findIndex(
    (s) => String(s.id) === String(id)
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <FlatList
        ref={pagerRef}
        data={groups}
        keyExtractor={(g) => g.categorySlug ?? g.id ?? String(g.adminUserId)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        initialScrollIndex={0}
        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
        renderItem={({ item, index }) => (
          <GroupView
            group={item}
            isActive={index === groupIdx}
            insetsTop={insets.top}
            insetsBottom={insets.bottom}
            onAdvanceGroup={advanceGroup}
            onReverseGroup={reverseGroup}
            onClose={close}
            initialStoryIndex={index === groupIdx && targetIdInGroup != null && targetIdInGroup >= 0 ? targetIdInGroup : 0}
          />
        )}
      />
    </View>
  );
}

function GroupView({
  group,
  isActive,
  insetsTop,
  insetsBottom,
  onAdvanceGroup,
  onReverseGroup,
  onClose,
  initialStoryIndex,
}: {
  group: Group;
  isActive: boolean;
  insetsTop: number;
  insetsBottom: number;
  onAdvanceGroup: () => void;
  onReverseGroup: () => void;
  onClose: () => void;
  initialStoryIndex: number;
}) {
  const [storyIdx, setStoryIdx] = useState(Math.max(0, initialStoryIndex));
  const [paused, setPaused] = useState(false);
  const progress = useSharedValue(0);

  const stories = group.stories ?? [];
  const current = stories[storyIdx];
  const duration = (current?.durationSec ?? 7) * 1000;

  useEffect(() => {
    if (!isActive) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    if (!current) return;
    socialApi.stories.view(current.id).catch(() => {});
    progress.value = 0;
    progress.value = withTiming(1, { duration }, (finished) => {
      if (finished) {
        if (storyIdx + 1 < stories.length) {
          runOnJS(setStoryIdx)(storyIdx + 1);
        } else {
          runOnJS(onAdvanceGroup)();
        }
      }
    });
    return () => {
      cancelAnimation(progress);
    };
  }, [isActive, storyIdx, current?.id, duration]);

  useEffect(() => {
    if (paused) {
      cancelAnimation(progress);
    } else if (isActive && current) {
      const remaining = duration * (1 - progress.value);
      progress.value = withTiming(1, { duration: remaining }, (finished) => {
        if (finished) {
          if (storyIdx + 1 < stories.length) {
            runOnJS(setStoryIdx)(storyIdx + 1);
          } else {
            runOnJS(onAdvanceGroup)();
          }
        }
      });
    }
  }, [paused]);

  // Сбрасываем на начало группы при смене активной группы.
  useEffect(() => {
    if (isActive) {
      setStoryIdx(Math.max(0, initialStoryIndex));
    } else {
      setStoryIdx(0);
    }
  }, [isActive]);

  const tapLeft = () => {
    if (storyIdx > 0) setStoryIdx(storyIdx - 1);
    else onReverseGroup();
  };
  const tapRight = () => {
    if (storyIdx + 1 < stories.length) setStoryIdx(storyIdx + 1);
    else onAdvanceGroup();
  };

  if (!current) return <View style={{ width: SCREEN_W, height: SCREEN_H }} />;

  return (
    <View style={{ width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' }}>
      {current.media?.type === 'video' ? (
        <Video
          source={{ uri: current.media.url ?? '' }}
          style={{ flex: 1 }}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive && !paused}
          isLooping={false}
          isMuted={false}
        />
      ) : current.media?.url ? (
        <Image
          source={{ uri: current.media.url }}
          placeholder={current.media.blurhash ? { blurhash: current.media.blurhash } : undefined}
          style={{ flex: 1 }}
          contentFit="cover"
          transition={150}
        />
      ) : null}

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 }}
      />

      <View
        style={{
          position: 'absolute',
          top: insetsTop + 8,
          left: 12,
          right: 12,
          flexDirection: 'row',
          gap: 4,
        }}
      >
        {stories.map((_, i) => (
          <ProgressBar key={i} index={i} activeIndex={storyIdx} progress={progress} />
        ))}
      </View>

      <View
        style={{
          position: 'absolute',
          top: insetsTop + 24,
          left: 12,
          right: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="leaf" size={18} color="#fff" />
        </View>
        <Text
          style={{
            flex: 1,
            color: '#fff',
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 14,
          }}
        >
          {group.categoryTitle ?? 'Greenman'}
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </View>

      <Pressable
        onPress={tapLeft}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        delayLongPress={180}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '30%' }}
      />
      <Pressable
        onPress={tapRight}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        delayLongPress={180}
        style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '30%' }}
      />
      <Pressable
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        delayLongPress={180}
        style={{ position: 'absolute', top: 0, bottom: 0, left: '30%', right: '30%' }}
      />

      {current.caption ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: insetsBottom + spacing.xl,
            left: spacing.md,
            right: spacing.md,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontFamily: 'Manrope_500Medium',
              fontSize: 15,
              lineHeight: 22,
            }}
            numberOfLines={4}
          >
            {current.caption}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ProgressBar({
  index,
  activeIndex,
  progress,
}: {
  index: number;
  activeIndex: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    let pct = 0;
    if (index < activeIndex) pct = 1;
    else if (index === activeIndex) pct = progress.value;
    return { width: `${pct * 100}%` };
  });
  return (
    <View
      style={{
        flex: 1,
        height: 2.5,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.35)',
        overflow: 'hidden',
      }}
    >
      <Animated.View style={[{ height: '100%', backgroundColor: '#fff' }, style]} />
    </View>
  );
}
