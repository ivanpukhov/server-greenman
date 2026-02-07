import {
    ArrayField,
    Create,
    Datagrid,
    DateField,
    Edit,
    List,
    NumberField,
    NumberInput,
    SelectInput,
    Show,
    ShowButton,
    SimpleForm,
    SimpleList,
    SimpleShowLayout,
    TextField,
    TextInput,
    required,
    useNotify
} from 'react-admin';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
    Alert,
    Box,
    Button,
    IconButton,
    Paper,
    Stack,
    TextField as MuiTextField,
    Typography,
    useMediaQuery
} from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { apiUrl } from '../../config/api';
import { adminAuthStorage } from '../authProvider';

const orderStatusChoices = [
    { id: 'в обработке', name: 'В обработке' },
    { id: 'Оплачено', name: 'Оплачено' },
    { id: 'Отправлено', name: 'Отправлено' },
    { id: 'Доставлено', name: 'Доставлено' },
    { id: 'Отменено', name: 'Отменено' }
];

const orderPeriodChoices = [
    { id: 'today', name: 'Сегодня' },
    { id: 'yesterday', name: 'Вчера' },
    { id: 'week', name: 'Неделя' },
    { id: 'month', name: 'Месяц' }
];

const deliveryMethodChoices = [
    { id: 'kazpost', name: 'Казпочта' },
    { id: 'indrive', name: 'InDrive' },
    { id: 'city', name: 'По городу' }
];

const normalizeScannerCode = (value) => String(value || '').trim().toLowerCase();

const calculateDeliveryCostFromProducts = (products, deliveryMethod) => {
    const normalizedMethod = String(deliveryMethod || '').trim().toLowerCase();

    if (normalizedMethod === 'kazpost') {
        const totalVolume = (Array.isArray(products) ? products : []).reduce((sum, item) => {
            const typeDescription = String(item?.typeName || '');
            const volumeMatch = typeDescription.match(/\b\d+\b/);
            let volume = 1000;

            if (volumeMatch && volumeMatch[0]) {
                volume = Number(volumeMatch[0]);
                if (!Number.isFinite(volume) || volume < 300) {
                    volume = 1000;
                }
            }

            return sum + volume * Math.max(1, Math.floor(Number(item?.quantity) || 1));
        }, 0);

        const basePrice = 1800;
        if (totalVolume <= 1000) {
            return basePrice;
        }

        const extraVolume = totalVolume - 1000;
        const extraCost = Math.ceil(extraVolume / 1000) * 400;
        return basePrice + extraCost;
    }

    if (normalizedMethod === 'indrive') {
        return 4000;
    }

    if (normalizedMethod === 'city') {
        return 1500;
    }

    return 3000;
};

const formatMoney = (value) => `${Math.round(Number(value) || 0)} ₸`;

const normalizePhoneForServer = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length > 10) {
        return digits.slice(-10);
    }

    return digits;
};

const OrderProductsInput = () => {
    const notify = useNotify();
    const { getValues, setValue } = useFormContext();
    const formProducts = useWatch({ name: 'products' }) || [];
    const [manualCode, setManualCode] = useState('');
    const [inventoryRows, setInventoryRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scannerHint, setScannerHint] = useState('');
    const scannerBufferRef = useRef('');
    const scannerStartedAtRef = useRef(0);
    const scannerLastAtRef = useRef(0);

    useEffect(() => {
        let isMounted = true;

        const loadInventory = async () => {
            setLoading(true);

            try {
                const token = adminAuthStorage.getToken();
                const response = await fetch(apiUrl('/admin/inventory/qr-codes'), {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const body = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(body.message || 'Не удалось загрузить товары для сканирования');
                }

                if (isMounted) {
                    setInventoryRows(Array.isArray(body.data) ? body.data : []);
                }
            } catch (error) {
                if (isMounted) {
                    notify(error.message, { type: 'error' });
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadInventory();

        return () => {
            isMounted = false;
        };
    }, [notify]);

    const inventoryByCode = useMemo(() => {
        const map = new Map();

        inventoryRows.forEach((row) => {
            if (!row?.code) {
                return;
            }

            map.set(normalizeScannerCode(row.code), row);
        });

        return map;
    }, [inventoryRows]);

    const updateProducts = (nextProducts) => {
        setValue('products', nextProducts, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    };

    const addInventoryRow = (row) => {
        if (!row) {
            return;
        }

        const currentProducts = Array.isArray(getValues('products')) ? getValues('products') : [];
        const existingIndex = currentProducts.findIndex((item) => Number(item.typeId) === Number(row.id));

        if (existingIndex >= 0) {
            const nextProducts = [...currentProducts];
            const currentQty = Math.max(1, Math.floor(Number(nextProducts[existingIndex].quantity) || 1));
            nextProducts[existingIndex] = {
                ...nextProducts[existingIndex],
                quantity: currentQty + 1
            };
            updateProducts(nextProducts);
            setScannerHint(`${row.productName} / ${row.typeName} +1`);
            return;
        }

        const nextProducts = [
            ...currentProducts,
            {
                productId: Number(row.productId),
                typeId: Number(row.id),
                code: String(row.code || ''),
                productName: String(row.productName || ''),
                typeName: String(row.typeName || ''),
                unitPrice: Number(row.typePrice) || 0,
                quantity: 1
            }
        ];

        updateProducts(nextProducts);
        setScannerHint(`${row.productName} / ${row.typeName} добавлен`);
    };

    const addByCode = (rawCode) => {
        const code = normalizeScannerCode(rawCode);
        if (!code) {
            return;
        }

        const row = inventoryByCode.get(code);
        if (!row) {
            notify(`Товар с кодом ${code} не найден`, { type: 'warning' });
            return;
        }

        addInventoryRow(row);
    };

    const updateQuantity = (typeId, quantityRaw) => {
        const quantity = Math.max(1, Math.floor(Number(quantityRaw) || 1));
        const nextProducts = formProducts.map((item) => {
            if (Number(item.typeId) !== Number(typeId)) {
                return item;
            }

            return {
                ...item,
                quantity
            };
        });

        updateProducts(nextProducts);
    };

    const removeType = (typeId) => {
        const nextProducts = formProducts.filter((item) => Number(item.typeId) !== Number(typeId));
        updateProducts(nextProducts);
    };

    useEffect(() => {
        if (inventoryByCode.size === 0) {
            return undefined;
        }

        const onKeyDown = (event) => {
            if (event.ctrlKey || event.altKey || event.metaKey) {
                return;
            }

            const target = event.target;
            const tagName = target?.tagName;
            if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable) {
                return;
            }

            const now = Date.now();

            if (event.key === 'Enter') {
                const scanValue = scannerBufferRef.current.trim();
                const elapsed = scannerStartedAtRef.current ? now - scannerStartedAtRef.current : Number.MAX_SAFE_INTEGER;

                scannerBufferRef.current = '';
                scannerStartedAtRef.current = 0;
                scannerLastAtRef.current = 0;

                if (!scanValue || elapsed > 1200) {
                    return;
                }

                addByCode(scanValue);
                return;
            }

            if (event.key.length !== 1) {
                return;
            }

            if (scannerStartedAtRef.current && now - scannerLastAtRef.current > 150) {
                scannerBufferRef.current = '';
                scannerStartedAtRef.current = 0;
            }

            if (!scannerStartedAtRef.current) {
                scannerStartedAtRef.current = now;
            }

            scannerLastAtRef.current = now;
            scannerBufferRef.current += event.key;
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [inventoryByCode]);

    return (
        <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="subtitle1">Товары в заказе</Typography>

            <Alert severity="info" sx={{ borderRadius: 2 }}>
                Откройте страницу создания заказа и сканируйте штрихкод. Каждый скан добавляет товар в заказ.
            </Alert>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <MuiTextField
                    label="Код товара"
                    value={manualCode}
                    onChange={(event) => setManualCode(event.target.value)}
                    fullWidth
                    autoFocus
                    disabled={loading}
                    placeholder="greenman-товар-тип"
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            addByCode(manualCode);
                            setManualCode('');
                        }
                    }}
                />
                <Button
                    variant="outlined"
                    disabled={loading}
                    onClick={() => {
                        addByCode(manualCode);
                        setManualCode('');
                    }}
                >
                    Добавить по коду
                </Button>
            </Stack>

            {scannerHint ? <Typography variant="caption">{scannerHint}</Typography> : null}

            {formProducts.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography color="text.secondary">Товары пока не добавлены.</Typography>
                </Paper>
            ) : (
                <Stack spacing={1.2}>
                    {formProducts.map((item) => {
                        const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
                        const unitPrice = Number(item.unitPrice) || 0;

                        return (
                            <Paper
                                key={item.typeId}
                                variant="outlined"
                                sx={{
                                    p: 1.5,
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', md: '1.6fr 1fr 120px 36px' },
                                    gap: 1.2,
                                    alignItems: 'center'
                                }}
                            >
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {item.productName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {item.typeName} | {item.code}
                                    </Typography>
                                </Box>

                                <Typography variant="body2">{formatMoney(unitPrice)}</Typography>

                                <MuiTextField
                                    size="small"
                                    type="number"
                                    label="Кол-во"
                                    inputProps={{ min: 1, step: 1 }}
                                    value={quantity}
                                    onChange={(event) => updateQuantity(item.typeId, event.target.value)}
                                />

                                <IconButton onClick={() => removeType(item.typeId)} color="error">
                                    <DeleteOutlineOutlinedIcon fontSize="small" />
                                </IconButton>
                            </Paper>
                        );
                    })}
                </Stack>
            )}
        </Stack>
    );
};

const OrderPricingSummary = () => {
    const { setValue } = useFormContext();
    const products = useWatch({ name: 'products' }) || [];
    const deliveryMethod = useWatch({ name: 'deliveryMethod' });
    const deliveryPriceRaw = useWatch({ name: 'deliveryPrice' });
    const [deliveryManuallyChanged, setDeliveryManuallyChanged] = useState(false);

    const productsTotal = useMemo(() => {
        return (Array.isArray(products) ? products : []).reduce((sum, item) => {
            const quantity = Math.max(1, Math.floor(Number(item?.quantity) || 1));
            const unitPrice = Number(item?.unitPrice) || 0;
            return sum + quantity * unitPrice;
        }, 0);
    }, [products]);

    const autoDeliveryPrice = useMemo(() => {
        return calculateDeliveryCostFromProducts(products, deliveryMethod);
    }, [products, deliveryMethod]);

    useEffect(() => {
        if (!deliveryManuallyChanged) {
            setValue('deliveryPrice', autoDeliveryPrice, {
                shouldDirty: true,
                shouldTouch: false,
                shouldValidate: true
            });
        }
    }, [autoDeliveryPrice, deliveryManuallyChanged, setValue]);

    const deliveryPrice = Math.max(0, Number(deliveryPriceRaw) || 0);
    const finalTotal = productsTotal + deliveryPrice;

    useEffect(() => {
        setValue('totalPrice', finalTotal, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false
        });
    }, [finalTotal, setValue]);

    return (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="subtitle1">Стоимость</Typography>

            <MuiTextField
                type="number"
                label="Стоимость доставки"
                value={deliveryPrice}
                onChange={(event) => {
                    setDeliveryManuallyChanged(true);
                    const nextValue = Math.max(0, Number(event.target.value) || 0);
                    setValue('deliveryPrice', nextValue, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true
                    });
                }}
                inputProps={{ min: 0, step: 100 }}
            />

            <Box>
                <Typography variant="body2" color="text.secondary">
                    Товары: {formatMoney(productsTotal)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Авто доставка: {formatMoney(autoDeliveryPrice)}
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.8 }}>
                    Итого: {formatMoney(finalTotal)}
                </Typography>
            </Box>

            {deliveryManuallyChanged ? (
                <Button
                    variant="text"
                    onClick={() => {
                        setDeliveryManuallyChanged(false);
                        setValue('deliveryPrice', autoDeliveryPrice, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true
                        });
                    }}
                    sx={{ alignSelf: 'flex-start' }}
                >
                    Вернуть автоцену доставки
                </Button>
            ) : null}
        </Stack>
    );
};

const transformCreateOrder = (data) => {
    const rawProducts = Array.isArray(data.products) ? data.products : [];
    const normalizedProducts = rawProducts
        .map((item) => {
            const productId = Number(item?.productId);
            const typeId = Number(item?.typeId);
            const quantity = Math.max(1, Math.floor(Number(item?.quantity) || 1));
            const unitPrice = Number(item?.unitPrice) || 0;
            const typeName = String(item?.typeName || '');

            if (!Number.isFinite(productId) || !Number.isFinite(typeId)) {
                return null;
            }

            return {
                productId,
                typeId,
                quantity,
                unitPrice,
                typeName
            };
        })
        .filter(Boolean);

    const productsTotal = normalizedProducts.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const autoDeliveryPrice = calculateDeliveryCostFromProducts(normalizedProducts, data.deliveryMethod);
    const deliveryPriceRaw = Number(data.deliveryPrice);
    const sanitizedDeliveryPrice = Number.isFinite(deliveryPriceRaw) && deliveryPriceRaw >= 0 ? deliveryPriceRaw : autoDeliveryPrice;
    const hasDeliveryOverride = Math.round(sanitizedDeliveryPrice) !== Math.round(autoDeliveryPrice);

    return {
        customerName: String(data.customerName || '').trim(),
        addressIndex: String(data.addressIndex || '').trim(),
        city: String(data.city || '').trim(),
        street: String(data.street || '').trim(),
        houseNumber: String(data.houseNumber || '').trim(),
        phoneNumber: normalizePhoneForServer(data.phoneNumber),
        kaspiNumber: data.kaspiNumber ? normalizePhoneForServer(data.kaspiNumber) : null,
        deliveryMethod: String(data.deliveryMethod || '').trim().toLowerCase(),
        paymentMethod: 'link',
        products: normalizedProducts.map((item) => ({
            productId: item.productId,
            typeId: item.typeId,
            quantity: item.quantity
        })),
        deliveryPriceOverride: hasDeliveryOverride ? sanitizedDeliveryPrice : null,
        totalPrice: productsTotal + sanitizedDeliveryPrice
    };
};

export const OrderList = () => {
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('sm'));

    return (
        <List
            perPage={10}
            sort={{ field: 'id', order: 'DESC' }}
            filters={[
                <SelectInput
                    key="period"
                    source="period"
                    label="Период"
                    choices={orderPeriodChoices}
                    alwaysOn
                    emptyText="Все"
                />
            ]}
        >
            {isSmall ? (
                <SimpleList
                    primaryText={(record) => `Заказ #${record.id}`}
                    secondaryText={(record) => `${record.customerName} • ${record.totalPrice} ₸`}
                    tertiaryText={(record) => record.status}
                    linkType="show"
                />
            ) : (
                <Datagrid rowClick="show" bulkActionButtons={false}>
                    <TextField source="id" label="ID" />
                    <TextField source="customerName" label="Клиент" />
                    <TextField source="phoneNumber" label="Телефон" />
                    <TextField source="city" label="Город" />
                    <NumberField source="totalPrice" label="Сумма" />
                    <TextField source="paymentMethod" label="Оплата" />
                    <TextField source="deliveryMethod" label="Доставка" />
                    <TextField source="status" label="Статус" />
                    <DateField source="createdAt" label="Дата" showTime locales="ru-RU" />
                    <ShowButton label="Детали" />
                </Datagrid>
            )}
        </List>
    );
};

export const OrderShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" label="ID" />
            <TextField source="customerName" label="Клиент" />
            <TextField source="phoneNumber" label="Телефон" />
            <TextField source="kaspiNumber" label="Kaspi" />
            <TextField source="city" label="Город" />
            <TextField source="street" label="Улица" />
            <TextField source="houseNumber" label="Дом" />
            <TextField source="addressIndex" label="Индекс" />
            <TextField source="deliveryMethod" label="Способ доставки" />
            <TextField source="paymentMethod" label="Способ оплаты" />
            <TextField source="status" label="Статус" />
            <TextField source="trackingNumber" label="Трек-номер" />
            <NumberField source="totalPrice" label="Сумма" />
            <DateField source="createdAt" label="Создан" showTime locales="ru-RU" />

            <ArrayField source="products" label="Товары">
                <Datagrid bulkActionButtons={false}>
                    <TextField source="productId" label="ID товара" />
                    <TextField source="productName" label="Название" />
                    <TextField source="typeId" label="ID типа" />
                    <TextField source="typeName" label="Тип" />
                    <NumberField source="quantity" label="Кол-во" />
                </Datagrid>
            </ArrayField>
        </SimpleShowLayout>
    </Show>
);

export const OrderCreate = () => (
    <Create transform={transformCreateOrder}>
        <SimpleForm
            defaultValues={{
                products: [],
                deliveryPrice: 0,
                paymentMethod: 'link'
            }}
        >
            <OrderProductsInput />
            <OrderPricingSummary />

            <TextInput source="customerName" label="Клиент" fullWidth validate={required()} />
            <TextInput source="phoneNumber" label="Телефон" fullWidth validate={required()} />
            <TextInput source="kaspiNumber" label="Kaspi номер (необязательно)" fullWidth />
            <TextInput source="city" label="Город" fullWidth validate={required()} />
            <TextInput source="street" label="Улица" fullWidth validate={required()} />
            <TextInput source="houseNumber" label="Дом" fullWidth validate={required()} />
            <TextInput source="addressIndex" label="Индекс" fullWidth validate={required()} />
            <SelectInput source="deliveryMethod" label="Способ доставки" choices={deliveryMethodChoices} fullWidth validate={required()} />
            <TextInput source="paymentMethod" label="Способ оплаты" fullWidth disabled />
        </SimpleForm>
    </Create>
);

export const OrderEdit = () => (
    <Edit mutationMode="pessimistic">
        <SimpleForm>
            <TextInput source="customerName" label="Клиент" fullWidth />
            <TextInput source="phoneNumber" label="Телефон" fullWidth />
            <TextInput source="city" label="Город" fullWidth />
            <TextInput source="street" label="Улица" fullWidth />
            <TextInput source="houseNumber" label="Дом" fullWidth />
            <TextInput source="addressIndex" label="Индекс" fullWidth />
            <TextInput source="deliveryMethod" label="Способ доставки" fullWidth />
            <TextInput source="paymentMethod" label="Способ оплаты" fullWidth />
            <SelectInput source="status" label="Статус" choices={orderStatusChoices} fullWidth />
            <TextInput source="trackingNumber" label="Трек-номер" fullWidth />
            <TextInput source="kaspiNumber" label="Kaspi номер" fullWidth />
            <NumberInput source="totalPrice" label="Сумма" min={0} fullWidth />
        </SimpleForm>
    </Edit>
);
