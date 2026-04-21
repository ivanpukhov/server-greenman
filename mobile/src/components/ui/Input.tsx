import { TextInput, TextInputProps, View, Pressable } from 'react-native';
import { Text } from './Text';
import { cssInterop } from 'nativewind';
import { forwardRef, ReactNode, useCallback, useState } from 'react';

cssInterop(TextInput, { className: 'style' });

type Variant = 'default' | 'floating';
type Mask = 'phone-kz' | 'phone-rf' | 'postal' | 'digits' | 'none';

type Props = Omit<TextInputProps, 'onChangeText'> & {
  label?: string;
  error?: string;
  hint?: string;
  variant?: Variant;
  mask?: Mask;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
  className?: string;
  containerClassName?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  /** Minimum height in pixels for multiline mode (default 96). */
  minHeight?: number;
};

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  const rest = digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits;
  const d = rest.slice(0, 10);
  let out = '+7';
  if (d.length > 0) out += ' (' + d.slice(0, 3);
  if (d.length >= 3) out += ')';
  if (d.length > 3) out += ' ' + d.slice(3, 6);
  if (d.length > 6) out += '-' + d.slice(6, 8);
  if (d.length > 8) out += '-' + d.slice(8, 10);
  return out;
}

function applyMask(value: string, mask: Mask): string {
  switch (mask) {
    case 'phone-kz':
    case 'phone-rf':
      return formatPhone(value);
    case 'postal':
      return value.replace(/\D/g, '').slice(0, 6);
    case 'digits':
      return value.replace(/\D/g, '');
    default:
      return value;
  }
}

export const Input = forwardRef<TextInput, Props>(function Input(
  {
    label,
    error,
    hint,
    variant: _variant,
    mask = 'none',
    leftIcon,
    rightIcon,
    onRightIconPress,
    className,
    containerClassName,
    value,
    onChangeText,
    onFocus,
    onBlur,
    placeholder,
    multiline,
    minHeight = 96,
    ...rest
  },
  ref
) {
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? 'border-red-500'
    : focused
    ? 'border-greenman-7'
    : 'border-border';

  const handleChange = useCallback(
    (text: string) => {
      const masked = applyMask(text, mask);
      onChangeText?.(masked);
    },
    [mask, onChangeText]
  );

  return (
    <View className={`w-full ${containerClassName ?? ''}`}>
      {label ? (
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">{label}</Text>
      ) : null}

      <View
        className={`${multiline ? 'py-2 items-start' : 'h-12 items-center'} flex-row rounded-xl border bg-white px-3 ${borderClass}`}
        style={multiline ? { minHeight } : undefined}
      >
        {leftIcon ? (
          <View className={multiline ? 'mr-2 mt-1' : 'mr-2'}>{leftIcon}</View>
        ) : null}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : undefined}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={`flex-1 text-base text-ink font-sans ${className ?? ''}`}
          style={multiline ? { paddingTop: 4 } : { paddingVertical: 0 }}
          {...rest}
        />

        {rightIcon ? (
          onRightIconPress ? (
            <Pressable onPress={onRightIconPress} className="ml-2 active:opacity-70">
              {rightIcon}
            </Pressable>
          ) : (
            <View className="ml-2">{rightIcon}</View>
          )
        ) : null}
      </View>

      {error ? (
        <Text className="mt-1 text-xs text-red-500">{error}</Text>
      ) : hint ? (
        <Text className="mt-1 text-xs text-ink-dim">{hint}</Text>
      ) : null}
    </View>
  );
});
