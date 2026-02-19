import {
    Create,
    Datagrid,
    DateField,
    DeleteButton,
    Edit,
    List,
    NumberInput,
    SelectInput,
    Show,
    ShowButton,
    SimpleForm,
    useListContext,
    useDataProvider,
    useRecordContext,
    useRefresh,
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
    Card,
    CardActionArea,
    CardContent,
    Chip,
    Divider,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    TextField as MuiTextField,
    Typography,
    useMediaQuery
} from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { useLocation } from 'react-router-dom';
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
const ORDER_BUNDLE_PREFIX = 'https://greenman.kz/order-bundle#';
const ORDER_BUNDLE_PATH_PREFIX = 'https://greenman.kz/order-bundle/';
const ORDER_BUNDLE_CODE_REGEX = /^ob_[A-Za-z0-9]{6,24}$/;

const decodeBase64Url = (value) => {
    const normalized = String(value || '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const binary = atob(normalized + padding);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
};

const parseOrderBundleFromCode = (rawCode) => {
    const code = String(rawCode || '').trim();
    if (!code.startsWith(ORDER_BUNDLE_PREFIX)) {
        return null;
    }

    const encoded = code.slice(ORDER_BUNDLE_PREFIX.length);
    if (!encoded) {
        return null;
    }

    try {
        const json = decodeBase64Url(encoded);
        const payload = JSON.parse(json);
        const deliveryPrice = Number(payload?.deliveryPrice);
        const items = Array.isArray(payload?.items) ? payload.items : [];

        if (Number(payload?.v) !== 1 || !Number.isFinite(deliveryPrice) || deliveryPrice < 0 || items.length === 0) {
            return null;
        }

        const normalizedItems = items
            .map((item) => ({
                productId: Number(item?.productId),
                typeId: Number(item?.typeId),
                quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1))
            }))
            .filter((item) => Number.isFinite(item.productId) && Number.isFinite(item.typeId) && item.quantity > 0);

        if (normalizedItems.length === 0) {
            return null;
        }

        const noteText = String(payload?.noteText || '').trim();

        return {
            deliveryPrice,
            items: normalizedItems,
            noteText
        };
    } catch (_error) {
        return null;
    }
};

const extractShortOrderBundleCode = (rawCode) => {
    const code = String(rawCode || '').trim();
    if (!code) {
        return null;
    }

    if (ORDER_BUNDLE_CODE_REGEX.test(code)) {
        return code;
    }

    if (code.startsWith(ORDER_BUNDLE_PATH_PREFIX)) {
        const candidate = code.slice(ORDER_BUNDLE_PATH_PREFIX.length).trim();
        return ORDER_BUNDLE_CODE_REGEX.test(candidate) ? candidate : null;
    }

    return null;
};

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
const formatDateTime = (value) => {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString('ru-RU');
};
const getStatusLabel = (value) =>
    orderStatusChoices.find((item) => String(item.id) === String(value))?.name || String(value || '—');
const getDeliveryMethodLabel = (value) =>
    deliveryMethodChoices.find((item) => String(item.id) === String(value))?.name || String(value || '—');

const normalizePhoneForServer = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length > 10) {
        return digits.slice(-10);
    }

    return digits;
};

const parseJsonObjectWithTrailingCommas = (rawValue) => {
    const value = String(rawValue || '').trim();
    if (!value) {
        return null;
    }

    const tryParse = (input) => {
        const parsed = JSON.parse(input);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return null;
        }
        return parsed;
    };

    try {
        return tryParse(value);
    } catch (_error) {
        try {
            const sanitized = value.replace(/,\s*([}\]])/g, '$1');
            return tryParse(sanitized);
        } catch (_error2) {
            return null;
        }
    }
};

const extractClientFieldsFromBundleJson = (rawValue) => {
    const parsed = parseJsonObjectWithTrailingCommas(rawValue);
    if (!parsed) {
        return null;
    }

    const customerName = String(parsed.kot || '').trim();
    const addressIndex = String(parsed.user_input || '').trim();
    const streetRaw = String(parsed.street || '').trim();
    const phoneNumber = normalizePhoneForServer(parsed.number);

    const streetTokens = streetRaw.split(/\s+/).filter(Boolean);
    const city = streetTokens.length > 0 ? streetTokens[0] : '';
    const houseNumber = streetTokens.length > 1 ? streetTokens[streetTokens.length - 1] : '';
    const street = streetTokens.length > 2 ? streetTokens.slice(1, -1).join(' ') : '';

    return {
        customerName,
        addressIndex,
        city,
        street,
        houseNumber,
        phoneNumber
    };
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

    const inventoryByTypeId = useMemo(() => {
        const map = new Map();
        inventoryRows.forEach((row) => {
            const typeId = Number(row?.id);
            if (!Number.isFinite(typeId)) {
                return;
            }
            map.set(typeId, row);
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

    const loadOrderBundleByCode = async (bundleCode) => {
        const token = adminAuthStorage.getToken();
        const response = await fetch(apiUrl(`/admin/order-bundles/${encodeURIComponent(bundleCode)}`), {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || 'Не удалось загрузить заказ из QR');
        }

        const data = body?.data || {};
        const deliveryPrice = Number(data.deliveryPrice);
        const items = Array.isArray(data.items) ? data.items : [];
        const normalizedItems = items
            .map((item) => ({
                productId: Number(item?.productId),
                typeId: Number(item?.typeId),
                quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1))
            }))
            .filter((item) => Number.isFinite(item.productId) && Number.isFinite(item.typeId) && item.quantity > 0);

        if (!Number.isFinite(deliveryPrice) || deliveryPrice < 0 || normalizedItems.length === 0) {
            throw new Error('QR-пакет заказа повреждён или пуст');
        }

        return {
            deliveryPrice,
            items: normalizedItems,
            noteText: String(data.noteText || '').trim()
        };
    };

    const addByCode = async (rawCode) => {
        const raw = String(rawCode || '').trim();
        if (!raw) {
            return;
        }

        const legacyBundle = parseOrderBundleFromCode(raw);
        const shortBundleCode = extractShortOrderBundleCode(raw);
        const bundle = legacyBundle || (shortBundleCode ? await loadOrderBundleByCode(shortBundleCode) : null);
        if (bundle) {
            const currentProducts = Array.isArray(getValues('products')) ? getValues('products') : [];
            const nextProductsMap = new Map();

            currentProducts.forEach((item) => {
                const typeId = Number(item?.typeId);
                if (!Number.isFinite(typeId)) {
                    return;
                }
                nextProductsMap.set(typeId, {
                    ...item,
                    quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1))
                });
            });

            let addedItemsCount = 0;
            bundle.items.forEach((bundleItem) => {
                const row = inventoryByTypeId.get(bundleItem.typeId);
                if (!row) {
                    return;
                }

                const existing = nextProductsMap.get(bundleItem.typeId);
                if (existing) {
                    existing.quantity = Math.max(1, Math.floor(Number(existing.quantity) || 1)) + bundleItem.quantity;
                    nextProductsMap.set(bundleItem.typeId, existing);
                    addedItemsCount += 1;
                    return;
                }

                nextProductsMap.set(bundleItem.typeId, {
                    productId: Number(row.productId),
                    typeId: Number(row.id),
                    code: String(row.code || ''),
                    productName: String(row.productName || ''),
                    typeName: String(row.typeName || ''),
                    unitPrice: Number(row.typePrice) || 0,
                    quantity: bundleItem.quantity
                });
                addedItemsCount += 1;
            });

            const nextProducts = Array.from(nextProductsMap.values());
            updateProducts(nextProducts);
            setValue('deliveryPrice', bundle.deliveryPrice, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true
            });
            setValue('deliveryForcedByBundle', true, {
                shouldDirty: true,
                shouldTouch: false,
                shouldValidate: false
            });

            if (addedItemsCount === 0) {
                notify('QR заказа распознан, но товары не найдены в каталоге', { type: 'warning' });
                return;
            }

            setValue('bundleNote', bundle.noteText || '', {
                shouldDirty: true,
                shouldTouch: false,
                shouldValidate: false
            });
            setScannerHint(`Добавлен заказ из QR: позиций ${addedItemsCount}, доставка ${bundle.deliveryPrice} ₸`);
            return;
        }

        const code = normalizeScannerCode(raw);
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

                addByCode(scanValue).catch((error) => {
                    notify(error.message || 'Не удалось обработать скан QR', { type: 'error' });
                });
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
    }, [inventoryByCode, inventoryByTypeId]);

    return (
        <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="subtitle1">Товары в заказе</Typography>

            <Alert severity="info" sx={{ borderRadius: 2 }}>
                Откройте страницу создания заказа и сканируйте QR/штрихкод. Обычный код добавляет один товар, общий QR заказа добавляет весь набор и доставку.
            </Alert>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <MuiTextField
                    label="Код товара"
                    value={manualCode}
                    onChange={(event) => setManualCode(event.target.value)}
                    fullWidth
                    autoFocus
                    disabled={loading}
                    placeholder="greenman.kz/product/... или общий QR заказа"
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            addByCode(manualCode).catch((error) => {
                                notify(error.message || 'Не удалось добавить код', { type: 'error' });
                            });
                            setManualCode('');
                        }
                    }}
                />
                <Button
                    variant="outlined"
                    disabled={loading}
                    onClick={() => {
                        addByCode(manualCode).catch((error) => {
                            notify(error.message || 'Не удалось добавить код', { type: 'error' });
                        });
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
    const notify = useNotify();
    const { setValue } = useFormContext();
    const products = useWatch({ name: 'products' }) || [];
    const deliveryMethod = useWatch({ name: 'deliveryMethod' });
    const deliveryPriceRaw = useWatch({ name: 'deliveryPrice' });
    const deliveryForcedByBundle = useWatch({ name: 'deliveryForcedByBundle' });
    const bundleNote = useWatch({ name: 'bundleNote' });
    const [deliveryManuallyChanged, setDeliveryManuallyChanged] = useState(false);
    const lastAutofillSignatureRef = useRef('');
    const normalizedBundleNote = String(bundleNote || '').trim();
    const rawBundleNote = String(bundleNote || '');
    const showBundleNoteCard = deliveryForcedByBundle || Boolean(rawBundleNote);

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
        if (deliveryForcedByBundle) {
            setDeliveryManuallyChanged(true);
        }
    }, [deliveryForcedByBundle]);

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

    const applyClientFieldsFromJsonText = (text) => {
        const extracted = extractClientFieldsFromBundleJson(text);
        if (!extracted) {
            return false;
        }

        const signature = JSON.stringify(extracted);
        if (signature === lastAutofillSignatureRef.current) {
            return true;
        }

        if (extracted.customerName) {
            setValue('customerName', extracted.customerName, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }
        if (extracted.addressIndex) {
            setValue('addressIndex', extracted.addressIndex, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }
        if (extracted.city) {
            setValue('city', extracted.city, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }
        if (extracted.street) {
            setValue('street', extracted.street, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }
        if (extracted.houseNumber) {
            setValue('houseNumber', extracted.houseNumber, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }
        if (extracted.phoneNumber && extracted.phoneNumber.length === 10) {
            setValue('phoneNumber', extracted.phoneNumber, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            setValue('kaspiNumber', extracted.phoneNumber, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }

        lastAutofillSignatureRef.current = signature;
        notify('Данные клиента заполнены из JSON', { type: 'success' });
        return true;
    };

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

            {showBundleNoteCard ? (
                <Paper
                    variant="outlined"
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        borderColor: 'rgba(16,40,29,0.18)',
                        background: 'linear-gradient(180deg, rgba(31,154,96,0.06) 0%, rgba(19,111,99,0.03) 100%)'
                    }}
                >
                    <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2">Комментарий из QR</Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ContentCopyOutlinedIcon fontSize="small" />}
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(normalizedBundleNote);
                                        notify('Комментарий скопирован', { type: 'success' });
                                    } catch (_error) {
                                        notify('Не удалось скопировать комментарий', { type: 'error' });
                                    }
                                }}
                            >
                                Скопировать
                            </Button>
                        </Stack>
                        <MuiTextField
                            multiline
                            minRows={4}
                            maxRows={12}
                            fullWidth
                            value={rawBundleNote}
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                setValue('bundleNote', nextValue, {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                    shouldValidate: false
                                });
                                applyClientFieldsFromJsonText(nextValue);
                            }}
                            helperText='Можно вставить JSON вида {"kot":"...","user_input":"...","street":"...","number":"..."}'
                        />
                    </Stack>
                </Paper>
            ) : null}

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
                        setValue('deliveryForcedByBundle', false, {
                            shouldDirty: true,
                            shouldTouch: false,
                            shouldValidate: false
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

const transformCreateOrder = (data, forcedConnectionId = null) => {
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

    const payload = {
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

    const dataConnectionId = Number(data.paymentLinkConnectionId);
    const connectionId = Number.isInteger(dataConnectionId) && dataConnectionId > 0 ? dataConnectionId : forcedConnectionId;
    if (Number.isInteger(connectionId) && connectionId > 0) {
        payload.paymentLinkConnectionId = connectionId;
    }

    return payload;
};

const parseOrderCreatePrefill = (search) => {
    const params = new URLSearchParams(search || '');
    const hasConnectionIdInSearch = String(params.get('paymentLinkConnectionId') || '').trim() !== '';

    if (!hasConnectionIdInSearch && typeof window !== 'undefined') {
        const hash = String(window.location.hash || '');
        const queryIndex = hash.indexOf('?');
        if (queryIndex >= 0) {
            const hashParams = new URLSearchParams(hash.slice(queryIndex + 1));
            const hashConnectionId = String(hashParams.get('paymentLinkConnectionId') || '').trim();
            if (hashConnectionId) {
                params.set('paymentLinkConnectionId', hashConnectionId);
            }

            if (!String(params.get('phoneNumber') || '').trim() && String(hashParams.get('phoneNumber') || '').trim()) {
                params.set('phoneNumber', String(hashParams.get('phoneNumber')));
            }
            if (!String(params.get('kaspiNumber') || '').trim() && String(hashParams.get('kaspiNumber') || '').trim()) {
                params.set('kaspiNumber', String(hashParams.get('kaspiNumber')));
            }
        }
    }

    const prefill = {};

    const connectionId = Number(params.get('paymentLinkConnectionId'));
    if (Number.isInteger(connectionId) && connectionId > 0) {
        prefill.paymentLinkConnectionId = connectionId;
    }

    const phoneNumber = normalizePhoneForServer(params.get('phoneNumber'));
    if (phoneNumber && phoneNumber.length === 10) {
        prefill.phoneNumber = phoneNumber;
    }

    const kaspiNumber = normalizePhoneForServer(params.get('kaspiNumber'));
    if (kaspiNumber && kaspiNumber.length === 10) {
        prefill.kaspiNumber = kaspiNumber;
    }

    return prefill;
};

export const OrderList = () => {
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('sm'));

    const OrderListContent = () => {
        const listContext = useListContext();
        const rows = Array.isArray(listContext.data) ? listContext.data : [];

        if (!isSmall) {
            return (
                <Datagrid rowClick="show" bulkActionButtons={false}>
                    <TextField source="id" label="ID" />
                    <TextField source="customerName" label="Клиент" />
                    <TextField source="phoneNumber" label="Телефон" />
                    <TextField source="city" label="Город" />
                    <TextField source="paymentMethod" label="Оплата" />
                    <TextField source="deliveryMethod" label="Доставка" />
                    <TextField source="status" label="Статус" />
                    <DateField source="createdAt" label="Дата" showTime locales="ru-RU" />
                    <ShowButton label="Детали" />
                    <DeleteButton label="Удалить" mutationMode="pessimistic" redirect={false} />
                </Datagrid>
            );
        }

        return (
            <Stack spacing={1.2} sx={{ p: 1.2 }}>
                {rows.map((record) => (
                    <Card key={record.id} variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardActionArea href={`#/orders/${record.id}/show`}>
                            <CardContent>
                                <Typography variant="subtitle2">Заказ #{record.id}</Typography>
                                <Typography variant="body2">{record.customerName}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    +7{record.phoneNumber} • {record.city}
                                </Typography>
                                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.8 }}>
                                    <Chip size="small" label={getStatusLabel(record.status)} />
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDateTime(record.createdAt)}
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                ))}
            </Stack>
        );
    };

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
            <OrderListContent />
        </List>
    );
};

export const OrderShow = () => (
    <Show actions={false}>
        <OrderShowContent />
    </Show>
);

const OrderStatusEditor = () => {
    const record = useRecordContext();
    const notify = useNotify();
    const dataProvider = useDataProvider();
    const refresh = useRefresh();
    const [nextStatus, setNextStatus] = useState('');
    const [savingStatus, setSavingStatus] = useState(false);

    useEffect(() => {
        setNextStatus(String(record?.status || ''));
    }, [record?.status]);

    if (!record) {
        return null;
    }

    const onSaveStatus = async () => {
        if (savingStatus || !nextStatus || nextStatus === record.status) {
            return;
        }

        setSavingStatus(true);
        try {
            await dataProvider.update('orders', {
                id: record.id,
                data: { status: nextStatus },
                previousData: record
            });
            notify('Статус заказа обновлен', { type: 'success' });
            refresh();
        } catch (error) {
            notify(error?.message || 'Не удалось обновить статус заказа', { type: 'error' });
        } finally {
            setSavingStatus(false);
        }
    };

    return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
            <MuiTextField
                select
                label="Статус заказа"
                value={nextStatus}
                onChange={(event) => setNextStatus(String(event.target.value))}
                sx={{ minWidth: { xs: '100%', sm: 220 } }}
                size="small"
            >
                {orderStatusChoices.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                        {item.name}
                    </MenuItem>
                ))}
            </MuiTextField>
            <Button
                variant="contained"
                onClick={onSaveStatus}
                disabled={savingStatus || !nextStatus || nextStatus === record.status}
            >
                Сохранить статус
            </Button>
        </Stack>
    );
};

const OrderPhotoSender = () => {
    const record = useRecordContext();
    const notify = useNotify();
    const [selectedFile, setSelectedFile] = useState(null);
    const [caption, setCaption] = useState('');
    const [sending, setSending] = useState(false);

    if (!record) {
        return null;
    }

    const onFileChange = (event) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
    };

    const onSend = async () => {
        if (!selectedFile || sending) {
            return;
        }

        setSending(true);
        try {
            const token = adminAuthStorage.getToken();
            const formData = new FormData();
            formData.append('file', selectedFile);

            const normalizedCaption = String(caption || '').trim();
            if (normalizedCaption) {
                formData.append('caption', normalizedCaption);
            }

            const response = await fetch(apiUrl(`/admin/orders/${record.id}/send-photo`), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });
            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(body.message || 'Не удалось отправить фото заказа');
            }

            notify('Фото заказа отправлено клиенту', { type: 'success' });
            setSelectedFile(null);
            setCaption('');
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setSending(false);
        }
    };

    return (
        <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(16,40,29,0.08)' }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Отправить фото заказа
            </Typography>
            <Stack spacing={1.2}>
                <Typography variant="body2" color="text.secondary">
                    Получатель: {record.phoneNumber ? `+7${record.phoneNumber}` : '—'}
                </Typography>
                <Button variant="outlined" component="label" disabled={sending}>
                    Выбрать файл
                    <input
                        type="file"
                        hidden
                        accept="image/*,application/pdf"
                        onChange={onFileChange}
                    />
                </Button>
                <Typography variant="caption" color="text.secondary">
                    {selectedFile ? selectedFile.name : 'Файл не выбран'}
                </Typography>
                <MuiTextField
                    size="small"
                    label="Подпись (необязательно)"
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    fullWidth
                />
                <Button
                    variant="contained"
                    disabled={!selectedFile || sending}
                    onClick={onSend}
                >
                    Отправить клиенту
                </Button>
            </Stack>
        </Paper>
    );
};

const OrderShowContent = () => {
    const record = useRecordContext();
    if (!record) {
        return null;
    }

    const orderProducts = Array.isArray(record.products) ? record.products : [];

    return (
        <Box>
            <Stack spacing={2.2}>
                <Paper
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: 3,
                        border: '1px solid rgba(16,40,29,0.08)',
                        background: 'linear-gradient(135deg, rgba(31,154,96,0.16) 0%, rgba(19,111,99,0.14) 100%)'
                    }}
                >
                    <Stack spacing={1.5}>
                        <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ md: 'center' }}
                            spacing={1}
                        >
                            <Box>
                                <Typography variant="h5">Заказ #{record.id}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Создан: {formatDateTime(record.createdAt)}
                                </Typography>
                            </Box>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip color="primary" label={getStatusLabel(record.status)} />
                                <Chip variant="outlined" label={`Итого: ${formatMoney(record.totalPrice)}`} />
                            </Stack>
                        </Stack>
                        <OrderStatusEditor />
                    </Stack>
                </Paper>

                <Grid container spacing={1.5}>
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(16,40,29,0.08)', height: '100%' }}>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                Клиент
                            </Typography>
                            <Typography variant="body2">Имя: {record.customerName || '—'}</Typography>
                            <Typography variant="body2">Телефон: {record.phoneNumber ? `+7${record.phoneNumber}` : '—'}</Typography>
                            <Typography variant="body2">Kaspi: {record.kaspiNumber ? `+7${record.kaspiNumber}` : '—'}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(16,40,29,0.08)', height: '100%' }}>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                Доставка
                            </Typography>
                            <Typography variant="body2">Способ: {getDeliveryMethodLabel(record.deliveryMethod)}</Typography>
                            <Typography variant="body2">Город: {record.city || '—'}</Typography>
                            <Typography variant="body2">Улица: {record.street || '—'}</Typography>
                            <Typography variant="body2">Дом: {record.houseNumber || '—'}</Typography>
                            <Typography variant="body2">Индекс: {record.addressIndex || '—'}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(16,40,29,0.08)', height: '100%' }}>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                Оплата и логистика
                            </Typography>
                            <Typography variant="body2">Оплата: {record.paymentMethod || '—'}</Typography>
                            <Typography variant="body2">Трек-номер: {record.trackingNumber || '—'}</Typography>
                            <Typography variant="body2">Сумма: {formatMoney(record.totalPrice)}</Typography>
                        </Paper>
                    </Grid>
                </Grid>

                <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(16,40,29,0.08)' }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                        Товары в заказе
                    </Typography>
                    {orderProducts.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            Товары не добавлены
                        </Typography>
                    ) : (
                        <Stack spacing={1.2}>
                            {orderProducts.map((item, index) => (
                                <Paper key={`${item.typeId || index}-${index}`} variant="outlined" sx={{ p: 1.4, borderRadius: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {item.productName || 'Без названия'} / {item.typeName || 'Тип не указан'}
                                    </Typography>
                                    <Divider sx={{ my: 0.8 }} />
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.4}>
                                        <Typography variant="body2">ID товара: {item.productId || '—'}</Typography>
                                        <Typography variant="body2">ID типа: {item.typeId || '—'}</Typography>
                                        <Typography variant="body2">Кол-во: {item.quantity || 1}</Typography>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </Paper>

                <OrderPhotoSender />
            </Stack>
        </Box>
    );
};

export const OrderCreate = () => {
    const location = useLocation();
    const prefill = useMemo(() => parseOrderCreatePrefill(location.search), [location.search]);
    const forcedConnectionId = Number(prefill.paymentLinkConnectionId) || null;

    return (
        <Create transform={(data) => transformCreateOrder(data, forcedConnectionId)}>
            <SimpleForm
                defaultValues={{
                    products: [],
                    deliveryPrice: 0,
                    deliveryForcedByBundle: false,
                    bundleNote: '',
                    paymentMethod: 'link',
                    ...prefill
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
                <SelectInput
                    source="deliveryMethod"
                    label="Способ доставки"
                    choices={deliveryMethodChoices}
                    fullWidth
                    validate={required()}
                />
                <TextInput source="paymentMethod" label="Способ оплаты" fullWidth disabled />
            </SimpleForm>
        </Create>
    );
};

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
