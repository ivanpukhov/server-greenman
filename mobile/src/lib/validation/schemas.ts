import { z } from 'zod';
import { isValidKzPhone } from '@/lib/format/phone';

export const phoneSchema = z
  .string()
  .refine(isValidKzPhone, { message: 'Введите корректный номер' });

export const confirmCodeSchema = z.object({
  code: z.string().regex(/^\d{4,6}$/, { message: 'Код должен содержать 4-6 цифр' }),
});

export type PhoneFormValues = { phone: string };
export type ConfirmCodeValues = z.infer<typeof confirmCodeSchema>;

export const checkoutKzSchema = z.object({
  customerName: z.string().trim().min(2, 'Укажите ФИО'),
  phoneNumber: z.string().refine(isValidKzPhone, { message: 'Введите корректный номер' }),
  kaspiNumber: z.string().refine(isValidKzPhone, { message: 'Введите номер Kaspi' }),
  city: z.string().trim().min(2, 'Выберите город'),
  addressIndex: z.string().regex(/^\d{6}$/, { message: 'Индекс — 6 цифр' }),
  street: z.string().trim().min(1, 'Укажите улицу'),
  houseNumber: z.string().trim().min(1, 'Укажите дом'),
  deliveryMethod: z.enum(['kazpost', 'indrive', 'city']),
  paymentMethod: z.enum(['kaspi', 'money']),
});

export type CheckoutKzValues = z.infer<typeof checkoutKzSchema>;

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isValidRfPhone(value: string): boolean {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 11 || digits.length === 10;
}

export const checkoutRfSchema = z.object({
  customerName: z.string().trim().min(2, 'Укажите ФИО'),
  email: z.string().trim().regex(emailRegex, 'Введите корректный email'),
  phoneNumber: z
    .string()
    .refine(isValidRfPhone, { message: 'Введите корректный номер (+7 XXX XXX-XX-XX)' }),
});

export type CheckoutRfValues = z.infer<typeof checkoutRfSchema>;
