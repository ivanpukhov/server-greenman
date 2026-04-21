import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { AdminFormScreen } from '@/components/admin/FormScreen';
import { Text } from '@/components/ui/Text';
import { useAdminProduct, useAdminProductUpdate } from '@/hooks/admin/useAdminProducts';

export default function AdminProductEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const numericId = Number(id);
  const one = useAdminProduct(numericId);
  const update = useAdminProductUpdate();

  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [description, setDescription] = useState('');
  const [kidsApp, setKidsApp] = useState('');
  const [adultsApp, setAdultsApp] = useState('');
  const [diseases, setDiseases] = useState('');
  const [contraindications, setContraindications] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (one.data && !loaded) {
      const p = one.data;
      setName(p.name);
      setAlias(p.alias ?? '');
      setDescription(p.description ?? '');
      setKidsApp(p.applicationMethodChildren ?? '');
      setAdultsApp(p.applicationMethodAdults ?? '');
      setDiseases(Array.isArray(p.diseases) ? p.diseases.join(', ') : '');
      setContraindications(p.contraindications ?? '');
      setVideoUrl(p.videoUrl ?? '');
      setLoaded(true);
    }
  }, [one.data, loaded]);

  const save = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Укажите название' });
      return;
    }
    if (!contraindications.trim()) {
      Toast.show({ type: 'error', text1: 'Противопоказания обязательны' });
      return;
    }
    const diseasesList = diseases
      .split(/\n|,|;/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (diseasesList.length === 0) {
      Toast.show({ type: 'error', text1: 'Укажите хотя бы одно заболевание' });
      return;
    }

    try {
      await update.mutateAsync({
        id: numericId,
        name: name.trim(),
        alias: alias.trim() || null,
        description: description.trim() || null,
        applicationMethodChildren: kidsApp.trim() || null,
        applicationMethodAdults: adultsApp.trim() || null,
        diseases: diseasesList,
        contraindications: contraindications.trim(),
        videoUrl: videoUrl.trim() || null,
        types: one.data?.types ?? [],
      } as any);
      Toast.show({ type: 'success', text1: 'Сохранено' });
      router.back();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка сохранения',
        text2: e?.response?.data?.message ?? e?.message,
      });
    }
  };

  return (
    <AdminFormScreen
      title={one.data?.name ?? 'Товар'}
      onSave={save}
      saving={update.isPending}
      saveDisabled={!loaded}
    >
      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Название *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          className="h-12 rounded-xl border border-border bg-white px-3 text-base text-ink"
        />
      </View>

      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Slug (alias)</Text>
        <TextInput
          value={alias}
          onChangeText={(v) => setAlias(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="my-product"
          placeholderTextColor="#9ca3af"
          className="h-12 rounded-xl border border-border bg-white px-3 text-base text-ink"
        />
      </View>

      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Описание</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          className="min-h-[120px] rounded-xl border border-border bg-white p-3 text-base text-ink"
        />
      </View>

      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">
          Применение (дети)
        </Text>
        <TextInput
          value={kidsApp}
          onChangeText={setKidsApp}
          multiline
          textAlignVertical="top"
          className="min-h-[80px] rounded-xl border border-border bg-white p-3 text-base text-ink"
        />
      </View>

      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">
          Применение (взрослые)
        </Text>
        <TextInput
          value={adultsApp}
          onChangeText={setAdultsApp}
          multiline
          textAlignVertical="top"
          className="min-h-[80px] rounded-xl border border-border bg-white p-3 text-base text-ink"
        />
      </View>

      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">
          Заболевания * (через запятую)
        </Text>
        <TextInput
          value={diseases}
          onChangeText={setDiseases}
          multiline
          textAlignVertical="top"
          className="min-h-[80px] rounded-xl border border-border bg-white p-3 text-base text-ink"
        />
      </View>

      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">
          Противопоказания *
        </Text>
        <TextInput
          value={contraindications}
          onChangeText={setContraindications}
          multiline
          textAlignVertical="top"
          className="min-h-[80px] rounded-xl border border-border bg-white p-3 text-base text-ink"
        />
      </View>

      <View>
        <Text className="mb-1.5 text-xs font-semibold text-ink-dim">Ссылка на видео</Text>
        <TextInput
          value={videoUrl}
          onChangeText={setVideoUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://..."
          placeholderTextColor="#9ca3af"
          className="h-12 rounded-xl border border-border bg-white px-3 text-base text-ink"
        />
      </View>

      {one.data && one.data.types.length > 0 ? (
        <View className="mt-4 rounded-xl border border-border bg-greenman-0 p-3">
          <Text className="text-xs font-semibold text-greenman-8">Варианты</Text>
          <View className="mt-2 gap-1">
            {one.data.types.map((t) => (
              <Text key={t.id} className="text-xs text-ink-dim">
                {t.type} — {t.price} ₸ ·{' '}
                {t.stockQuantity === null ? '∞' : `${t.stockQuantity} шт.`}
              </Text>
            ))}
          </View>
          <Text className="mt-2 text-[10px] text-ink-dim">
            Цены, остатки и варианты меняются через веб-админку.
          </Text>
        </View>
      ) : null}
    </AdminFormScreen>
  );
}
