import { SafeAreaView } from 'react-native-safe-area-context';
import { View, ViewProps, KeyboardAvoidingView, Platform } from 'react-native';
import { cssInterop } from 'nativewind';

cssInterop(SafeAreaView, { className: 'style' });
cssInterop(View, { className: 'style' });

type Edge = 'top' | 'bottom' | 'left' | 'right';

type Props = ViewProps & {
  edges?: Edge[];
  className?: string;
  /**
   * When true, wraps children in KeyboardAvoidingView (padding on iOS).
   * Use on screens with TextInputs whose focus must not be covered by the keyboard.
   */
  avoidKeyboard?: boolean;
};

export function Screen({
  className,
  edges,
  children,
  avoidKeyboard,
  ...rest
}: Props) {
  const content = avoidKeyboard ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      {children}
    </KeyboardAvoidingView>
  ) : (
    children
  );

  return (
    <SafeAreaView
      edges={edges ?? ['top', 'left', 'right']}
      className={`flex-1 bg-background ${className ?? ''}`}
      {...rest}
    >
      {content}
    </SafeAreaView>
  );
}
