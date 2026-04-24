export const greenman = {
  0: '#e8f6ee',
  1: '#d1edde',
  2: '#a8debe',
  3: '#7bcd9b',
  4: '#52bd7b',
  5: '#2fb160',
  6: '#0e9a47',
  7: '#007d38',
  8: '#006e30',
  9: '#00622a',
  10: '#04401d',
  ink: '#05210f',
} as const;

export const clay = {
  0: '#fbf3ec',
  1: '#f5e2d1',
  2: '#ecc5a6',
  3: '#e0a576',
  4: '#d08550',
  5: '#b6672f',
  6: '#8f4d1f',
} as const;

export const sun = {
  0: '#fff7d6',
  1: '#ffe68a',
  2: '#f6c84a',
  3: '#d8a421',
} as const;

export const sand = {
  0: '#faf7f2',
  1: '#f3eee6',
  2: '#e7e0d2',
  3: '#c8bfae',
  4: '#a69c86',
} as const;

export const plum = {
  0: '#efe7f2',
  1: '#d9c5e0',
  2: '#a07aae',
  3: '#6f4684',
  4: '#4a2b5e',
} as const;

export const ink = {
  DEFAULT: '#0b1a11',
  80: '#1c2a22',
  60: '#4f5a54',
  40: '#8a948d',
  20: '#c4cac6',
} as const;

export const semantic = {
  surface: '#ffffff',
  surfaceMuted: sand[1],
  surfaceSunken: '#efe9df',
  surfaceCream: sand[0],
  surfaceInverse: greenman.ink,
  border: '#ede6d9',
  borderStrong: '#ded3bf',
  borderCool: '#e2ecde',
  ink: ink.DEFAULT,
  inkDim: ink[60],
  inkMuted: ink[40],
  inkInverse: '#fdfbf5',
  accent: greenman[7],
  accentMuted: greenman[1],
  accentGlow: greenman[4],
  accentHover: greenman[8],
  success: '#1b8e3f',
  warning: '#c78412',
  danger: '#c0392b',
  info: '#2b6cb0',
  overlay: 'rgba(11, 26, 17, 0.5)',
} as const;

export const colors = {
  primary: greenman[7],
  primaryDark: greenman[8],
  background: sand[0],
  surface: semantic.surface,
  border: semantic.border,
  muted: '#6b7280',
  ink: semantic.ink,
  inkDim: semantic.inkDim,
  danger: semantic.danger,
  warn: semantic.warning,
  success: semantic.success,
} as const;

export const gradients = {
  hero: [greenman.ink, greenman[9], greenman[7]] as const,
  heroWarm: [greenman.ink, clay[6], clay[4]] as const,
  sunrise: [greenman[8], sun[2]] as const,
  cta: [greenman[7], greenman[9]] as const,
  clay: [clay[4], clay[5], clay[6]] as const,
  plum: [plum[3], plum[4]] as const,
  story: [sun[2], clay[4], greenman[5]] as const,
  shimmer: [sand[1], sand[2], sand[1]] as const,
} as const;
