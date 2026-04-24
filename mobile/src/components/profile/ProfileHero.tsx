import { View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/IconButton';
import { StatPill } from '@/components/ui/StatPill';
import { greenman, clay } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

cssInterop(LinearGradient, { className: 'style' });

const SCREEN_W = Dimensions.get('window').width;

type Props = {
  name: string;
  subtitle?: string;
  initials?: string;
  stats: { value: string | number; label: string }[];
  onSettings?: () => void;
};

export function ProfileHero({ name, subtitle, initials, stats, onSettings }: Props) {
  const insets = useSafeAreaInsets();
  const fallbackInitials = initials ?? name.slice(0, 1).toUpperCase();
  return (
    <View style={{ marginBottom: 56 }}>
      <LinearGradient
        colors={['#05210f', greenman[10], greenman[8]]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 80,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
          overflow: 'hidden',
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -40,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: 200,
            backgroundColor: clay[4],
            opacity: 0.22,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 40,
            left: -80,
            width: 180,
            height: 180,
            borderRadius: 120,
            backgroundColor: greenman[5],
            opacity: 0.18,
          }}
        />

        <View className="flex-row items-start justify-between">
          <Text variant="meta-upper" tracking="widest" className="text-white/70">
            Профиль
          </Text>
          <IconButton
            icon={<Ionicons name="settings-outline" size={20} color="#ffffff" />}
            tone="glass"
            size="md"
            onPress={onSettings}
            accessibilityLabel="Настройки"
          />
        </View>

        <View className="mt-8 items-center">
          <View
            className="h-24 w-24 items-center justify-center overflow-hidden rounded-pill"
            style={{ backgroundColor: clay[3], borderWidth: 4, borderColor: '#ffffff', ...shadows.float }}
          >
            <Text
              className="text-white"
              style={{ fontFamily: 'SourceSerifPro_700Bold', fontSize: 36, lineHeight: 40 }}
            >
              {fallbackInitials}
            </Text>
          </View>
          <Text
            variant="display-serif"
            className="mt-4 text-center text-white"
            style={{ fontSize: 26, lineHeight: 30 }}
          >
            {name}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-[13px] text-white/65" tracking="tight">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </LinearGradient>

      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: -40,
          ...shadows.card,
        }}
      >
        <View
          className="flex-row items-stretch gap-2 rounded-xl bg-white p-3"
          style={{ width: SCREEN_W - 40 }}
        >
          {stats.map((s, i) => (
            <View key={i} className="flex-1">
              <StatPill value={s.value} label={s.label} tone="light" />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
