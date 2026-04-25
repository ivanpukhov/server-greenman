import { Screen } from '@/components/ui/Screen';
import { CheckoutKz } from '@/components/checkout/CheckoutKz';
import { CheckoutRf } from '@/components/checkout/CheckoutRf';
import { useCountryStore } from '@/stores/country.store';

export default function CheckoutScreen() {
  const country = useCountryStore((s) => s.country);
  return (
    <Screen edges={['left', 'right']} avoidKeyboard>
      {country === 'RF' ? <CheckoutRf /> : <CheckoutKz />}
    </Screen>
  );
}
