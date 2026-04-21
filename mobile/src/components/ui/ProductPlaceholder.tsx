import { View } from 'react-native';
import { Text } from './Text';
import { greenman } from '@/theme/colors';

type Size = 'card' | 'detail' | 'cart' | 'thumb';

type Props = {
  name: string;
  alias?: string;
  size?: Size;
  rounded?: boolean;
  className?: string;
};

const monogramSize: Record<Size, string> = {
  card: 'text-5xl',
  detail: 'text-8xl',
  cart: 'text-2xl',
  thumb: 'text-xl',
};

const palettePairs: Array<[string, string]> = [
  [greenman[0], greenman[2]],
  [greenman[1], greenman[3]],
  [greenman[0], greenman[4]],
  [greenman[2], greenman[5]],
  [greenman[1], greenman[6]],
  [greenman[0], greenman[3]],
  [greenman[1], greenman[4]],
];

function hashToIndex(input: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

/**
 * Premium product placeholder: decorative blob composition + monogram.
 * Visually distinguishes products by hashing alias/name — looks intentional, not broken.
 */
export function ProductPlaceholder({ name, alias, size = 'card', rounded = false, className }: Props) {
  const key = alias || name;
  const pair = palettePairs[hashToIndex(key, palettePairs.length)];
  const rotation = hashToIndex(key + '1', 6) * 15;
  const offsetX = (hashToIndex(key + '2', 5) - 2) * 8;
  const offsetY = (hashToIndex(key + '3', 5) - 2) * 8;

  const initial = name.charAt(0).toUpperCase();
  const radius = rounded ? 'rounded-xl' : '';

  return (
    <View
      className={`items-center justify-center overflow-hidden ${radius} ${className ?? ''}`}
      style={{ backgroundColor: pair[0] }}
    >
      {/* Large decorative blob */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: '140%',
          height: '80%',
          borderRadius: 9999,
          backgroundColor: pair[1],
          opacity: 0.35,
          transform: [
            { translateX: offsetX },
            { translateY: offsetY - 20 },
            { rotate: `${rotation}deg` },
          ],
          top: '-20%',
          left: '-20%',
        }}
      />
      {/* Secondary leaf-like blob */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: '55%',
          aspectRatio: 0.5,
          borderTopLeftRadius: 9999,
          borderBottomRightRadius: 9999,
          backgroundColor: pair[1],
          opacity: 0.22,
          bottom: -10,
          right: -20,
          transform: [{ rotate: `${rotation - 30}deg` }],
        }}
      />
      {/* Small dot */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 18,
          height: 18,
          borderRadius: 9999,
          backgroundColor: pair[1],
          opacity: 0.5,
          top: 16,
          left: 16,
        }}
      />

      <Text
        className={`font-display ${monogramSize[size]}`}
        style={{ color: greenman[8] }}
      >
        {initial}
      </Text>
    </View>
  );
}
