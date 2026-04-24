import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

type ShadowSpec = {
  color: string;
  offsetY: number;
  blur: number;
  opacity: number;
  elevation: number;
};

const specs: Record<'card' | 'sheet' | 'overlay', ShadowSpec> = {
  card: { color: '#0f1a12', offsetY: 2, blur: 8, opacity: 0.06, elevation: 2 },
  sheet: { color: '#0f1a12', offsetY: 8, blur: 24, opacity: 0.12, elevation: 8 },
  overlay: { color: '#0f1a12', offsetY: 12, blur: 40, opacity: 0.18, elevation: 16 },
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
  card: toStyle(specs.card),
  sheet: toStyle(specs.sheet),
  overlay: toStyle(specs.overlay),
} as const;

export type ShadowToken = keyof typeof shadows;
