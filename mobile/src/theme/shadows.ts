import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

type ShadowSpec = {
  color: string;
  offsetY: number;
  blur: number;
  opacity: number;
  elevation: number;
};

const specs: Record<'flat' | 'soft' | 'card' | 'float' | 'sheet' | 'overlay' | 'glow' | 'glowClay', ShadowSpec> = {
  flat: { color: '#0b1a11', offsetY: 1, blur: 2, opacity: 0.04, elevation: 1 },
  soft: { color: '#0b1a11', offsetY: 6, blur: 18, opacity: 0.06, elevation: 3 },
  card: { color: '#0b1a11', offsetY: 10, blur: 26, opacity: 0.08, elevation: 6 },
  float: { color: '#0b1a11', offsetY: 14, blur: 34, opacity: 0.14, elevation: 10 },
  sheet: { color: '#0b1a11', offsetY: 8, blur: 24, opacity: 0.12, elevation: 8 },
  overlay: { color: '#0b1a11', offsetY: 16, blur: 44, opacity: 0.22, elevation: 16 },
  glow: { color: '#007d38', offsetY: 14, blur: 28, opacity: 0.45, elevation: 8 },
  glowClay: { color: '#b6672f', offsetY: 14, blur: 26, opacity: 0.4, elevation: 8 },
};

function toStyle(spec: ShadowSpec): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: spec.elevation };
  }
  return {
    shadowColor: spec.color,
    shadowOffset: { width: 0, height: spec.offsetY },
    shadowRadius: spec.blur,
    shadowOpacity: spec.opacity,
  };
}

export const shadows = {
  flat: toStyle(specs.flat),
  soft: toStyle(specs.soft),
  card: toStyle(specs.card),
  float: toStyle(specs.float),
  sheet: toStyle(specs.sheet),
  overlay: toStyle(specs.overlay),
  glow: toStyle(specs.glow),
  glowClay: toStyle(specs.glowClay),
} as const;

export type ShadowToken = keyof typeof shadows;
