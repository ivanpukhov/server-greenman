import { Text as RNText, TextProps } from 'react-native';
import { cssInterop } from 'nativewind';

cssInterop(RNText, { className: 'style' });

export type TextVariant =
  | 'display-serif'
  | 'display'
  | 'h1'
  | 'h1-serif'
  | 'h2'
  | 'h2-serif'
  | 'h3'
  | 'body-lg'
  | 'body'
  | 'label'
  | 'caption'
  | 'meta'
  | 'meta-upper'
  | 'number-xl';

type Tone =
  | 'ink'
  | 'ink-dim'
  | 'ink-muted'
  | 'ink-inverse'
  | 'accent'
  | 'danger'
  | 'sun'
  | 'clay'
  | 'white';

const variantClass: Record<TextVariant, string> = {
  'display-serif': 'font-serif text-[40px] leading-[44px]',
  display: 'font-display text-display',
  h1: 'font-display text-h1',
  'h1-serif': 'font-serif text-[30px] leading-[36px]',
  h2: 'font-bold text-h2',
  'h2-serif': 'font-serif text-[24px] leading-[30px]',
  h3: 'font-bold text-h3',
  'body-lg': 'font-sans text-body-lg',
  body: 'font-sans text-body',
  label: 'font-semibold text-label',
  caption: 'font-sans text-caption',
  meta: 'font-sans text-meta',
  'meta-upper': 'font-bold text-meta uppercase',
  'number-xl': 'font-display text-[26px] leading-[30px]',
};

const toneClass: Record<Tone, string> = {
  ink: 'text-ink',
  'ink-dim': 'text-ink-dim',
  'ink-muted': 'text-ink-muted',
  'ink-inverse': 'text-ink-inverse',
  accent: 'text-greenman-8',
  danger: 'text-danger',
  sun: 'text-sun-3',
  clay: 'text-clay-5',
  white: 'text-white',
};

type Props = TextProps & {
  className?: string;
  variant?: TextVariant;
  tone?: Tone;
  upper?: boolean;
  tracking?: 'tight' | 'normal' | 'wide' | 'widest';
};

const trackingStyle = {
  tight: -0.3,
  normal: 0,
  wide: 0.6,
  widest: 1.4,
};

export function Text({ variant, tone, upper, tracking, style, className, ...rest }: Props) {
  const base = variant ? variantClass[variant] : 'font-sans';
  const t = tone ? toneClass[tone] : variant ? '' : 'text-ink';
  const upperClass = upper ? 'uppercase' : '';
  const mergedClass = className
    ? `${base} ${t} ${upperClass} ${className}`.trim()
    : `${base} ${t} ${upperClass}`.trim();
  const mergedStyle =
    tracking !== undefined
      ? [{ letterSpacing: trackingStyle[tracking] }, style]
      : style;
  return <RNText {...rest} style={mergedStyle} className={mergedClass} />;
}
