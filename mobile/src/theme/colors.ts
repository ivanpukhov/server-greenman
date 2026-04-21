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
} as const;

export const colors = {
  primary: greenman[6],
  primaryDark: greenman[7],
  background: '#ffffff',
  surface: '#ffffff',
  border: '#ececec',
  muted: '#6b7280',
  ink: '#0f1a12',
  inkDim: '#5b6360',
  danger: '#d1352b',
  warn: '#d97706',
  success: greenman[6],
} as const;
