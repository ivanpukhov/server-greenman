import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { greenman, sand } from '@/theme/colors';

type Props = {
  country: 'KZ' | 'RF';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
};

const SIZE = {
  sm: { box: 24, font: 10 },
  md: { box: 36, font: 13 },
  lg: { box: 46, font: 15 },
} as const;

export function CountryMark({ country, size = 'md', active }: Props) {
  const s = SIZE[size];
  const isKz = country === 'KZ';
  return (
    <View
      style={{
        width: s.box,
        height: s.box,
        borderRadius: Math.max(8, s.box / 3),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: active ? 'rgba(255,255,255,0.45)' : sand[2],
        backgroundColor: isKz ? '#19a7c4' : '#ffffff',
      }}
    >
      {isKz ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              position: 'absolute',
              width: s.box * 0.42,
              height: s.box * 0.42,
              borderRadius: s.box,
              backgroundColor: '#f6c84a',
              opacity: 0.95,
            }}
          />
          <Text style={{ fontSize: s.font, color: greenman.ink, fontWeight: '800' }}>KZ</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: '#ffffff' }} />
          <View style={{ flex: 1, backgroundColor: '#2354a6' }} />
          <View style={{ flex: 1, backgroundColor: '#d52b1e' }} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: s.font, color: '#ffffff', fontWeight: '800' }}>RU</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function CurrencyMark({ country, active }: { country: 'KZ' | 'RF'; active?: boolean }) {
  return (
    <View
      style={{
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: active ? 'rgba(255,255,255,0.18)' : sand[1],
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '800',
          color: active ? '#ffffff' : greenman[8],
        }}
      >
        {country === 'KZ' ? 'KZT' : 'RUB'}
      </Text>
    </View>
  );
}
