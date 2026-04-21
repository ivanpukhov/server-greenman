export function formatRfPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  let out = '';
  if (digits.length > 0) out = '+' + digits[0];
  if (digits.length > 1) out += ' ' + digits.slice(1, 4);
  if (digits.length >= 4) out += ' ' + digits.slice(4, 7);
  if (digits.length >= 7) out += '-' + digits.slice(7, 9);
  if (digits.length >= 9) out += '-' + digits.slice(9, 11);
  return out;
}

export function toServerPhoneRf(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return digits ? `+${digits}` : '';
}
