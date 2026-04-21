import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'error';
};

export function EmptyState({ title, subtitle, actionLabel, onAction, variant = 'default' }: Props) {
  const titleColor = variant === 'error' ? 'text-red-600' : 'text-ink';
  return (
    <View className="items-center justify-center rounded-xl border border-border bg-white px-5 py-10">
      <Text className={`text-base font-semibold ${titleColor}`}>{title}</Text>
      {subtitle ? (
        <Text className="mt-1 text-center text-sm text-ink-dim">{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" className="mt-5 px-6" onPress={onAction} />
      ) : null}
    </View>
  );
}
