import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { socialApi } from '@/features/social/api';
import BlockRenderer from '@/features/social/BlockRenderer';
import { greenman, semantic } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { formatRelativeRu } from '@/lib/format/relativeTime';

type CourseDayFile = { id: number; url: string; originalName: string };

type CourseDayReport = {
  id: number;
  courseDayId: number;
  text?: string | null;
  createdAt: string;
  reviewStatus?: string | null;
  reviewerComment?: string | null;
};

type CourseDaySupportMessage = {
  id: number;
  senderType: 'admin' | 'user';
  text?: string | null;
  createdAt: string;
};

type CourseDayData = {
  day: {
    id: number;
    dayNumber: number;
    title: string;
    contentBlocks?: unknown;
    files?: CourseDayFile[];
    completed?: boolean;
    reports?: CourseDayReport[];
  };
  enrollment?: { id: number } | null;
  progress?: { completedDayNumbers: number[]; percent: number };
  course?: { durationDays?: number };
};

export default function CourseDayScreen() {
  const { slug, dayNumber } = useLocalSearchParams<{ slug: string; dayNumber: string }>();
  const [data, setData] = useState<CourseDayData | null>(null);
  const [report, setReport] = useState('');
  const [supportOpen, setSupportOpen] = useState(false);
  const [support, setSupport] = useState<CourseDaySupportMessage[]>([]);
  const [supportText, setSupportText] = useState('');
  const [completing, setCompleting] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  const refresh = useCallback(async () => {
    if (!slug || !dayNumber) return;
    try {
      const fresh = (await socialApi.courses.day(slug, dayNumber)) as CourseDayData;
      setData(fresh);
    } catch {
      /* ignore */
    }
  }, [slug, dayNumber]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadSupport = useCallback(async () => {
    if (!data?.enrollment?.id) return;
    try {
      const res = (await socialApi.courses.supportList(data.enrollment.id)) as CourseDaySupportMessage[];
      setSupport(Array.isArray(res) ? res : []);
    } catch {
      /* ignore */
    }
  }, [data?.enrollment?.id]);

  useEffect(() => {
    if (supportOpen) loadSupport();
  }, [supportOpen, loadSupport]);

  const submitReport = async () => {
    if (!data?.enrollment?.id || !data.day?.id || !report.trim()) return;
    setSubmittingReport(true);
    try {
      await socialApi.courses.submitReport(data.enrollment.id, {
        courseDayId: data.day.id,
        text: report.trim(),
      });
      setReport('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refresh();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось отправить');
    } finally {
      setSubmittingReport(false);
    }
  };

  const sendSupport = async () => {
    if (!data?.enrollment?.id || !supportText.trim()) return;
    try {
      await socialApi.courses.supportSend(data.enrollment.id, {
        text: supportText.trim(),
      });
      setSupportText('');
      await loadSupport();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось отправить');
    }
  };

  const markComplete = async () => {
    if (!slug || !dayNumber) return;
    setCompleting(true);
    try {
      await socialApi.courses.completeDay(slug, dayNumber);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refresh();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось');
    } finally {
      setCompleting(false);
    }
  };

  const completed = data?.day?.completed;
  const reports = data?.day?.reports ?? [];
  const percent = data?.progress?.percent ?? 0;
  const totalDays = data?.course?.durationDays ?? 0;

  return (
    <Screen avoidKeyboard>
      <Header title={data ? `День ${data.day.dayNumber}` : 'День'} />
      {!data ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-ink-dim">Загрузка…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing['3xl'],
            gap: spacing.sm,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {totalDays > 0 ? (
            <View style={{ marginBottom: spacing.xs }}>
              <View
                style={{
                  height: 4,
                  borderRadius: radii.full,
                  backgroundColor: semantic.surfaceSunken,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${percent}%`,
                    backgroundColor: greenman[7],
                  }}
                />
              </View>
              <Text
                style={{
                  marginTop: 6,
                  fontFamily: 'Manrope_500Medium',
                  fontSize: 12,
                  color: semantic.inkDim,
                }}
              >
                Прогресс {percent}% · день {data.day.dayNumber} из {totalDays}
              </Text>
            </View>
          ) : null}

          <Text
            style={{
              fontFamily: 'Hagrid_700Bold',
              fontSize: 26,
              lineHeight: 32,
              color: semantic.ink,
            }}
          >
            День {data.day.dayNumber}: {data.day.title}
          </Text>

          <BlockRenderer blocks={data.day.contentBlocks as never} />

          {Array.isArray(data.day.files) && data.day.files.length > 0 ? (
            <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 16,
                  color: semantic.ink,
                }}
              >
                Материалы
              </Text>
              {data.day.files.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => Linking.openURL(f.url).catch(() => {})}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    borderWidth: 1,
                    borderColor: semantic.border,
                    backgroundColor: semantic.surface,
                    borderRadius: radii.md,
                    padding: spacing.sm,
                  }}
                >
                  <Ionicons name="document-attach-outline" size={18} color={greenman[7]} />
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: 'Manrope_500Medium',
                      fontSize: 14,
                      color: semantic.ink,
                    }}
                    numberOfLines={1}
                  >
                    {f.originalName}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View
            style={{
              marginTop: spacing.sm,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: semantic.border,
              backgroundColor: semantic.surface,
              padding: spacing.md,
              gap: spacing.xs,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons
                name={completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={22}
                color={completed ? greenman[7] : semantic.inkMuted}
              />
              <Text
                style={{
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 16,
                  color: semantic.ink,
                }}
              >
                {completed ? 'День пройден' : 'Отметить день пройденным'}
              </Text>
            </View>
            {!completed ? (
              <Button
                label={completing ? 'Отмечаем…' : 'Отметить пройденным'}
                onPress={markComplete}
                disabled={completing}
              />
            ) : null}
          </View>

          <View
            style={{
              marginTop: spacing.sm,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: semantic.border,
              backgroundColor: semantic.surface,
              padding: spacing.md,
              gap: spacing.xs,
            }}
          >
            <Text
              style={{
                fontFamily: 'Manrope_700Bold',
                fontSize: 16,
                color: semantic.ink,
              }}
            >
              Домашнее задание
            </Text>

            {reports.length > 0 ? (
              <View style={{ gap: spacing.xs, marginBottom: spacing.xs }}>
                {reports.map((r) => (
                  <View
                    key={r.id}
                    style={{
                      borderRadius: radii.md,
                      backgroundColor: semantic.surfaceSunken,
                      padding: spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Manrope_600SemiBold',
                          fontSize: 12,
                          color: semantic.inkDim,
                        }}
                      >
                        {formatRelativeRu(r.createdAt)}
                      </Text>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: radii.full,
                          backgroundColor:
                            r.reviewStatus === 'approved'
                              ? greenman[1]
                              : r.reviewStatus === 'rejected'
                              ? '#FDE2E2'
                              : '#FEF0DB',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Manrope_600SemiBold',
                            fontSize: 11,
                            color:
                              r.reviewStatus === 'approved'
                                ? greenman[8]
                                : r.reviewStatus === 'rejected'
                                ? '#B02A37'
                                : '#8A5A10',
                          }}
                        >
                          {r.reviewStatus === 'approved'
                            ? 'Принято'
                            : r.reviewStatus === 'rejected'
                            ? 'Отклонено'
                            : 'На проверке'}
                        </Text>
                      </View>
                    </View>
                    {r.text ? (
                      <Text
                        style={{
                          marginTop: 6,
                          fontFamily: 'Manrope_500Medium',
                          fontSize: 14,
                          color: semantic.ink,
                        }}
                      >
                        {r.text}
                      </Text>
                    ) : null}
                    {r.reviewerComment ? (
                      <Text
                        style={{
                          marginTop: 6,
                          fontFamily: 'Manrope_500Medium',
                          fontSize: 13,
                          color: greenman[8],
                        }}
                      >
                        Куратор: {r.reviewerComment}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            <TextInput
              value={report}
              onChangeText={setReport}
              multiline
              textAlignVertical="top"
              placeholder="Опишите, что сделали"
              placeholderTextColor={semantic.inkMuted}
              style={{
                minHeight: 96,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: semantic.border,
                backgroundColor: semantic.surface,
                padding: spacing.sm,
                fontFamily: 'Manrope_500Medium',
                fontSize: 15,
                color: semantic.ink,
              }}
            />
            <Button
              label={submittingReport ? 'Отправляем…' : 'Отправить отчёт'}
              onPress={submitReport}
              disabled={submittingReport || !report.trim()}
            />
          </View>

          <Pressable
            onPress={() => setSupportOpen((v) => !v)}
            style={{
              marginTop: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: semantic.border,
              backgroundColor: semantic.surface,
              paddingVertical: spacing.sm,
            }}
          >
            <Ionicons name="chatbubbles-outline" size={18} color={greenman[7]} />
            <Text
              style={{
                fontFamily: 'Manrope_600SemiBold',
                fontSize: 14,
                color: semantic.ink,
              }}
            >
              {supportOpen ? 'Скрыть чат куратора' : 'Написать куратору'}
            </Text>
          </Pressable>

          {supportOpen ? (
            <View style={{ gap: spacing.xs }}>
              {support.map((m) => (
                <View
                  key={m.id}
                  style={{
                    alignSelf: m.senderType === 'admin' ? 'flex-start' : 'flex-end',
                    maxWidth: '86%',
                    borderRadius: radii.lg,
                    padding: spacing.sm,
                    backgroundColor:
                      m.senderType === 'admin' ? greenman[0] : greenman[7],
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Manrope_600SemiBold',
                      fontSize: 11,
                      color: m.senderType === 'admin' ? greenman[8] : 'rgba(255,255,255,0.85)',
                      marginBottom: 2,
                    }}
                  >
                    {m.senderType === 'admin' ? 'Куратор' : 'Вы'}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Manrope_500Medium',
                      fontSize: 14,
                      color: m.senderType === 'admin' ? semantic.ink : '#fff',
                    }}
                  >
                    {m.text}
                  </Text>
                </View>
              ))}
              <TextInput
                value={supportText}
                onChangeText={setSupportText}
                multiline
                textAlignVertical="top"
                placeholder="Сообщение куратору"
                placeholderTextColor={semantic.inkMuted}
                style={{
                  minHeight: 72,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: semantic.border,
                  backgroundColor: semantic.surface,
                  padding: spacing.sm,
                  fontFamily: 'Manrope_500Medium',
                  fontSize: 15,
                  color: semantic.ink,
                }}
              />
              <Button label="Отправить" variant="secondary" onPress={sendSupport} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
