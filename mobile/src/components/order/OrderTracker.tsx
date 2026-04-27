import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { greenman, ink, sand } from '@/theme/colors';
import type { OrderStatus } from '@/lib/api/types';

const STEPS = [
  { key: 'created', label: 'Создан' },
  { key: 'paid', label: 'Оплачен' },
  { key: 'shipped', label: 'В пути' },
  { key: 'delivered', label: 'Доставлен' },
] as const;

function statusIndex(status?: OrderStatus | string) {
  const s = String(status ?? '').toLowerCase();
  if (s.includes('достав')) return 3;
  if (s.includes('отправ') || s.includes('пути')) return 2;
  if (s.includes('оплач')) return 1;
  return 0;
}

export function OrderTracker({ status }: { status?: OrderStatus | string }) {
  const active = statusIndex(status);

  return (
    <View className="rounded-lg bg-white p-4" style={{ borderWidth: 1, borderColor: ink[20] }}>
      <Text className="text-[13px] font-semibold text-ink">Статус заказа</Text>
      <View className="mt-5 flex-row items-start">
        {STEPS.map((step, index) => {
          const done = index <= active;
          const isCurrent = index === active;
          return (
            <View key={step.key} className="flex-1 items-center">
              {index > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    left: '-50%',
                    right: '50%',
                    top: 12,
                    height: 3,
                    backgroundColor: index <= active ? greenman[5] : ink[20],
                  }}
                />
              ) : null}
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: isCurrent ? 30 : 24,
                  height: isCurrent ? 30 : 24,
                  backgroundColor: done ? greenman[7] : sand[1],
                  borderWidth: done ? 0 : 1,
                  borderColor: ink[20],
                }}
              >
                {done ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
              </View>
              <Text className="mt-2 text-center text-[11px] font-semibold text-ink" numberOfLines={2}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
