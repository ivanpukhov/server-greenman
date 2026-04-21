export type Country = 'KZ' | 'RF';
export type Currency = 'KZT' | 'RUB';

export type ProductType = {
  id: number;
  productId: number;
  type: string;
  code?: string | null;
  alias?: string | null;
  price: number;
  stockQuantity?: number | null;
};

export type Product = {
  id: number;
  name: string;
  alias?: string | null;
  description?: string | null;
  diseases?: string[] | null;
  contraindications?: string | null;
  applicationMethodChildren?: string | null;
  applicationMethodAdults?: string | null;
  videoUrl?: string | null;
  types?: ProductType[];
};

export type User = {
  id: number;
  phoneNumber: string;
  role: 'user' | 'admin';
  isPhoneConfirmed: boolean;
};

export type OrderProfile = {
  id: number;
  userId: number;
  name: string;
  addressIndex?: string | null;
  city: string;
  street?: string | null;
  houseNumber?: string | null;
  phoneNumber: string;
};

export type OrderStatus =
  | 'в обработке'
  | 'оплачено'
  | 'отправлено'
  | 'доставлено'
  | 'отменен';

export type OrderProductLine = {
  productId: number;
  productName: string;
  typeId: number;
  type: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: number;
  userId?: number;
  customerName: string;
  addressIndex?: string | null;
  city: string;
  street?: string | null;
  houseNumber?: string | null;
  phoneNumber: string;
  email?: string | null;
  country: Country;
  currency: Currency;
  deliveryMethod: string;
  paymentMethod: string;
  products: OrderProductLine[];
  totalPrice: number;
  status: OrderStatus | string;
  trackingNumber?: string | null;
  kaspiNumber?: string | null;
  cdekUuid?: string | null;
  cdekNumber?: string | null;
  cdekStatus?: string | null;
  cdekTrackingNumber?: string | null;
  cdekDeliveryMode?: 'door' | 'pvz' | null;
  cdekPvzCode?: string | null;
  cdekAddress?: string | null;
  cdekCalcPriceRub?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CdekCity = {
  code: number;
  city: string;
  region?: string;
  full_name?: string;
  country_code?: string;
};

export type CdekPvz = {
  code: string;
  name: string;
  address?: string;
  full_address?: string;
  work_time?: string;
  note?: string;
  location?: { latitude: number; longitude: number };
};

export type CdekDeliveryMode = 'door' | 'pvz';

export type CdekCalculateRequest = {
  toCityCode: number;
  toAddress?: string;
  deliveryMode: CdekDeliveryMode;
  products: Array<{ productTypeId: number; quantity: number }>;
};

export type CdekCalculateResponse = {
  delivery_sum: number;
  currency?: string;
  period_min?: number;
  period_max?: number;
  total_sum?: number;
};

export type AuthRegisterLoginResponse = {
  success: boolean;
  message?: string;
  phoneNumber?: string;
};

export type AuthConfirmCodeResponse = {
  token: string;
  userId: number;
};
