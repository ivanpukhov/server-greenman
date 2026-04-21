import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { socialApi } from '@/features/social/api';
import BlockRenderer from '@/features/social/BlockRenderer';

export default function CourseDayScreen() {
  const { slug, dayNumber } = useLocalSearchParams<{ slug: string; dayNumber: string }>();
  const [data, setData] = useState<any>(null);
  const [report, setReport] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [support, setSupport] = useState<any[]>([]);
  const [supportText, setSupportText] = useState('');

  useEffect(() => {
    if (slug && dayNumber) socialApi.courses.day(slug, dayNumber).then(setData).catch(() => {});
  }, [slug, dayNumber]);

  const loadSupport = async () => {
    if (!data?.enrollment?.id) return;
    try { setSupport(await socialApi.courses.supportList(data.enrollment.id)); } catch (_e) {}
  };

  useEffect(() => { if (supportOpen) loadSupport(); }, [supportOpen, data?.enrollment?.id]);

  const submitReport = async () => {
    try {
      await socialApi.courses.submitReport(data.enrollment.id, { courseDayId: data.day.id, text: report });
      setReportSent(true); setReport('');
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
  };

  const sendSupport = async () => {
    if (!supportText.trim()) return;
    try {
      await socialApi.courses.supportSend(data.enrollment.id, { text: supportText.trim() });
      setSupportText('');
      await loadSupport();
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
  };

  if (!data) return <Text style={{ padding: 12 }}>Загрузка…</Text>;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Pressable onPress={() => router.back()}><Text className="text-blue-600">← Назад</Text></Pressable>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>День {data.day.dayNumber}: {data.day.title}</Text>
      <BlockRenderer blocks={data.day.contentBlocks} />
      {Array.isArray(data.day.files) && data.day.files.length > 0 && (
        <View>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Файлы</Text>
          {data.day.files.map((f: any) => (
            <Pressable key={f.id} onPress={() => Linking.openURL(f.url)}>
              <Text style={{ color: '#1a56db' }}>📎 {f.originalName}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>Отчёт</Text>
        {reportSent && <Text style={{ color: 'green' }}>Отчёт отправлен</Text>}
        <TextInput
          value={report}
          onChangeText={setReport}
          multiline
          numberOfLines={4}
          placeholder="Ваш отчёт"
          style={{ borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, minHeight: 80 }}
        />
        <Pressable onPress={submitReport} className="bg-green-600 py-2 rounded-lg items-center mt-2">
          <Text className="text-white font-semibold">Отправить</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => setSupportOpen((v) => !v)} className="py-2 rounded-lg border border-gray-300 items-center">
        <Text>{supportOpen ? 'Скрыть' : 'Написать куратору'}</Text>
      </Pressable>
      {supportOpen && (
        <View>
          {support.map((m) => (
            <View key={m.id} style={{ padding: 8, backgroundColor: m.senderType === 'admin' ? '#eef' : '#efe', borderRadius: 6, marginTop: 4 }}>
              <Text style={{ fontWeight: '600' }}>{m.senderType === 'admin' ? 'Куратор' : 'Вы'}:</Text>
              <Text>{m.text}</Text>
            </View>
          ))}
          <TextInput
            value={supportText}
            onChangeText={setSupportText}
            multiline
            numberOfLines={2}
            placeholder="Сообщение куратору"
            style={{ borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, minHeight: 60, marginTop: 8 }}
          />
          <Pressable onPress={sendSupport} className="bg-blue-600 py-2 rounded-lg items-center mt-2">
            <Text className="text-white font-semibold">Отправить</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
