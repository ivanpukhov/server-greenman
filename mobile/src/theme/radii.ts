export const radii = {
  none: 0,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radii;
