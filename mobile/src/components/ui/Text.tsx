import { Text as RNText, TextProps } from 'react-native';
import { cssInterop } from 'nativewind';

cssInterop(RNText, { className: 'style' });

export function Text(props: TextProps & { className?: string }) {
  return <RNText {...props} className={props.className ?? 'text-ink font-sans'} />;
}
