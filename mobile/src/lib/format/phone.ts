export function stripToDigits(input: string): string {
  return input.replace(/\D+/g, '');
}

export function formatKzPhoneInput(raw: string): string {
  const digits = stripToDigits(raw).replace(/^7?/, '').slice(0, 10);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 8);
  const p4 = digits.slice(8, 10);
  let out = '+7';
  if (p1) out += ` (${p1}`;
  if (p1.length === 3) out += ')';
  if (p2) out += ` ${p2}`;
  if (p3) out += `-${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

export function toE164Kz(input: string): string {
  const digits = stripToDigits(input).replace(/^8/, '7');
  if (digits.startsWith('7') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return `+${digits}`;
}

export function toApiPhoneKz(input: string): string {
  const digits = stripToDigits(input).replace(/^8/, '7');
  if (digits.startsWith('7')) return digits.slice(1);
  return digits.slice(-10);
}

export function isValidKzPhone(input: string): boolean {
  return toApiPhoneKz(input).length === 10;
}
