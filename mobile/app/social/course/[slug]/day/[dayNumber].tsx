import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { socialApi } from '@/features/social/api';
import BlockRenderer from '@/features/social/BlockRenderer';
import { greenman } from '@/theme/colors';

export default function CourseDayScreen() {
  const { slug, dayNumber } = useLocalSearchParams<{ slug: string; dayNumber: string }>();
  const [data, setData] = useState<any>(null);
  const [report, setReport] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [support, setSupport] = useState<any[]>([]);
  const [supportText, setSupportText] = useState('');

  useEffect(() => {
    if (slug && dayNumber) {
      socialApi.courses.day(slug, dayNumber).then(setData).catch(() => {});
    }
  }, [slug, dayNumber]);

  const loadSupport = async () => {
    if (!data?.enrollment?.id) return;
    try {
      setSupport(await socialApi.courses.supportList(data.enrollment.id));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (supportOpen) loadSupport();
  }, [supportOpen, data?.enrollment?.id]);

  const submitReport = async () => {
    try {
      await socialApi.courses.submitReport(data.enrollment.id, {
        courseDayId: data.day.id,
        text: report,
      });
      setReportSent(true);
      setReport('');
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message);
    }
  };

  const sendSupport = async () => {
    if (!supportText.trim()) return;
    try {
      await socialApi.courses.supportSend(data.enrollment.id, {
        text: supportText.trim(),
      });
      setSupportText('');
      await loadSupport();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message);
    }
  };

  return (
    <Screen avoidKeyboard>
      <Header title={data ? `День ${data.day.dayNumber}` : 'День'} />
      {!data ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-ink-dim">Загрузка…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text className="text-2xl font-display text-ink">
            День {data.day.dayNumber}: {data.day.title}
          </Text>
          <BlockRenderer blocks={data.day.contentBlocks} />
          {Array.isArray(data.day.files) && data.day.files.length > 0 ? (
            <View className="mt-2 gap-2">
              <Text className="text-lg font-bold text-ink">Файлы</Text>
              {data.day.files.map((f: any) => (
                <Pressable
                  key={f.id}
                  onPress={() => Linking.openURL(f.url).catch(() => {})}
                  className="flex-row items-center gap-2 rounded-xl border border-border bg-white p-3 active:opacity-70"
                >
                  <Ionicons
                    name="document-attach-outline"
                    size={18}
                    color={greenman[7]}
                  />
                  <Text className="flex-1 text-sm text-ink" numberOfLines={1}>
                    {f.originalName}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View className="mt-2">
            <Text className="text-lg font-bold text-ink">Отчёт</Text>
            {reportSent ? (
              <Text className="mt-1 text-sm text-greenman-8">
                Отчёт отправлен
              </Text>
            ) : null}
            <TextInput
              value={report}
              onChangeText={setReport}
              multiline
              textAlignVertical="top"
              placeholder="Ваш отчёт"
              placeholderTextColor="#9ca3af"
              className="mt-2 min-h-[96px] rounded-xl border border-border bg-white p-3 text-base text-ink"
            />
            <View className="mt-2">
              <Button label="Отправить" onPress={submitReport} />
            </View>
          </View>

          <Pressable
            onPress={() => setSupportOpen((v) => !v)}
            className="mt-2 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-white py-3 active:opacity-70"
          >
            <Ionicons name="chatbubbles-outline" size={18} color={greenman[7]} />
            <Text className="text-sm font-semibold text-ink">
              {supportOpen ? 'Скрыть' : 'Написать куратору'}
            </Text>
          </Pressable>

          {supportOpen ? (
            <View className="gap-2">
              {support.map((m) => (
                <View
                  key={m.id}
                  className={`rounded-xl p-3 ${m.senderType === 'admin' ? 'bg-greenman-0' : 'bg-white border border-border'}`}
                >
                  <Text className="text-xs font-semibold text-ink-dim">
                    {m.senderType === 'admin' ? 'Куратор' : 'Вы'}
                  </Text>
                  <Text className="mt-1 text-sm text-ink">{m.text}</Text>
                </View>
              ))}
              <TextInput
                value={supportText}
                onChangeText={setSupportText}
                multiline
                textAlignVertical="top"
                placeholder="Сообщение куратору"
                placeholderTextColor="#9ca3af"
                className="min-h-[72px] rounded-xl border border-border bg-white p-3 text-base text-ink"
              />
              <Button
                label="Отправить"
                variant="secondary"
                onPress={sendSupport}
              />
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
