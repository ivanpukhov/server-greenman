import { ReactNode } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

type Props = {
  title: string;
  children: ReactNode;
  onSave: () => void;
  onDelete?: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  deleteConfirmText?: string;
};

export function AdminFormScreen({
  title,
  children,
  onSave,
  onDelete,
  saving,
  saveDisabled,
  deleteConfirmText = 'Удалить безвозвратно?',
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);

  const confirmDelete = () => {
    if (!onDelete) return;
    Alert.alert('Удалить?', deleteConfirmText, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title={title}
        onBack={() => router.back()}
        rightAction={
          onDelete ? (
            <IconButton
              icon={<Ionicons name="trash-outline" size={20} color="#dc2626" />}
              onPress={confirmDelete}
              accessibilityLabel="Удалить"
            />
          ) : null
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120 + bottomPad }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="gap-4">{children}</View>
        </ScrollView>
        <View
          className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-3 pt-3"
          style={{ paddingBottom: bottomPad }}
        >
          <Button
            label="Сохранить"
            size="lg"
            loading={saving}
            disabled={saveDisabled}
            onPress={onSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
