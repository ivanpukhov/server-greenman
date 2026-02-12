import {
    ArrayField,
    ArrayInput,
    Create,
    Datagrid,
    DeleteButton,
    Edit,
    EditButton,
    FunctionField,
    List,
    NumberField,
    NumberInput,
    required,
    Show,
    ShowButton,
    SimpleForm,
    SimpleFormIterator,
    SimpleShowLayout,
    TextField,
    TextInput,
    TopToolbar,
    ListContextProvider,
    useListContext,
} from 'react-admin';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    InputAdornment,
    Stack,
    TextField as MuiTextField,
    Typography,
    useMediaQuery
} from '@mui/material';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import { apiUrl } from '../../config/api';
import { adminAuthStorage } from '../authProvider';

const ProductListActions = ({ searchValue, onSearchChange, onSearchSubmit, onSearchReset }) => {
    return (
        <TopToolbar sx={{ width: '100%' }}>
            <Box sx={{ width: { xs: '100%', sm: 420 } }}>
                <MuiTextField
                    size="small"
                    fullWidth
                    value={searchValue}
                    placeholder="Поиск товара по названию"
                    onChange={(event) => onSearchChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            onSearchSubmit();
                        }
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchOutlinedIcon fontSize="small" />
                            </InputAdornment>
                        )
                    }}
                />
            </Box>
            <Button onClick={onSearchSubmit}>Найти</Button>
            <Button onClick={onSearchReset}>Сброс</Button>
        </TopToolbar>
    );
};

const ProductScannerSync = ({ onDetectProductName }) => {
    const [codeToName, setCodeToName] = useState({});
    const scannerBufferRef = useRef('');
    const scannerStartedAtRef = useRef(0);
    const scannerLastAtRef = useRef(0);

    useEffect(() => {
        let isMounted = true;

        const loadCodes = async () => {
            try {
                const token = adminAuthStorage.getToken();
                const response = await fetch(apiUrl('/admin/inventory/qr-codes'), {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const body = await response.json().catch(() => ({}));
                if (!response.ok || !Array.isArray(body.data) || !isMounted) {
                    return;
                }

                const nextMap = {};
                body.data.forEach((row) => {
                    if (row?.code && row?.productName) {
                        nextMap[String(row.code).trim()] = String(row.productName).trim();
                    }
                });

                setCodeToName(nextMap);
            } catch (_error) {
                // No-op: QR sync is optional enhancement for list search.
            }
        };

        loadCodes();

        return () => {
            isMounted = false;
        };
    }, []);

    const hasCodes = useMemo(() => Object.keys(codeToName).length > 0, [codeToName]);

    useEffect(() => {
        if (!hasCodes) {
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

                if (!scanValue) {
                    return;
                }

                if (elapsed > 1200) {
                    return;
                }

                const productName = codeToName[scanValue];
                if (productName) {
                    onDetectProductName(productName);
                }
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
    }, [codeToName, hasCodes, onDetectProductName]);

    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.8,
                fontSize: 12,
                color: 'text.secondary',
                px: 1,
                py: 0.5
            }}
        >
            <QrCodeScannerOutlinedIcon sx={{ fontSize: 16 }} />
            Сканируйте QR на этой странице: название товара подставится в поиск автоматически.
        </Box>
    );
};

const ProductListContent = ({ searchTerm }) => {
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('sm'));
    const listContext = useListContext();

    const filteredData = useMemo(() => {
        const source = Array.isArray(listContext.data) ? listContext.data : [];
        const query = String(searchTerm || '').trim().toLocaleLowerCase('ru-RU');

        if (!query) {
            return source;
        }

        return source.filter((record) =>
            String(record?.name || '')
                .toLocaleLowerCase('ru-RU')
                .includes(query)
        );
    }, [listContext.data, searchTerm]);

    const filteredIds = useMemo(() => filteredData.map((record) => record.id), [filteredData]);

    const filteredListContext = useMemo(
        () => ({
            ...listContext,
            data: filteredData,
            ids: filteredIds,
            total: filteredData.length
        }),
        [filteredData, filteredIds, listContext]
    );

    return (
        <ListContextProvider value={filteredListContext}>
            {isSmall ? (
                <Stack spacing={1.2} sx={{ p: 1.2 }}>
                    {filteredData.map((record) => {
                        const types = Array.isArray(record?.types) ? record.types : [];
                        const hasInfinite = types.some((typeItem) => typeItem?.stockQuantity === null);
                        const totalStock = hasInfinite
                            ? 'Бесконечность'
                            : types.reduce((sum, typeItem) => sum + Math.max(0, Number(typeItem?.stockQuantity) || 0), 0);

                        return (
                            <Card key={record.id} variant="outlined" sx={{ borderRadius: 2 }}>
                                <CardActionArea href={`#/products/${record.id}/show`}>
                                    <CardContent>
                                        <Typography variant="subtitle2">{record.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Типов: {types.length}
                                        </Typography>
                                        <Typography variant="body2">
                                            Остаток: {totalStock === 'Бесконечность' ? totalStock : `${totalStock} шт.`}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            ID: {record.id}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        );
                    })}
                </Stack>
            ) : (
                <Datagrid rowClick="show" bulkActionButtons={false}>
                    <TextField source="id" label="ID" />
                    <TextField source="name" label="Название" />
                    <FunctionField label="Кол-во типов" render={(record) => record.types?.length || 0} />
                    <FunctionField
                        label="Остаток"
                        render={(record) => {
                            const types = Array.isArray(record?.types) ? record.types : [];
                            if (types.length === 0) {
                                return '0 шт.';
                            }

                            const hasInfinite = types.some((typeItem) => typeItem?.stockQuantity === null);
                            if (hasInfinite) {
                                return 'Бесконечность';
                            }

                            const totalStock = types.reduce(
                                (sum, typeItem) => sum + Math.max(0, Number(typeItem?.stockQuantity) || 0),
                                0
                            );
                            return `${totalStock} шт.`;
                        }}
                    />
                    <TextField source="videoUrl" label="Видео URL" />
                    <EditButton label="Изменить" />
                    <ShowButton label="Детали" />
                    <DeleteButton label="Удалить" mutationMode="pessimistic" />
                </Datagrid>
            )}
        </ListContextProvider>
    );
};

const transformProduct = (data) => {
    const diseases = Array.isArray(data.diseases)
        ? data.diseases
        : String(data.diseases || '')
              .split(/\n|,|;/)
              .map((item) => item.trim())
              .filter(Boolean);

    return {
        ...data,
        diseases,
        types: Array.isArray(data.types)
            ? data.types.map((typeItem) => ({
                  id: typeItem.id || undefined,
                  type: typeItem.type,
                  price: Number(typeItem.price) || 0,
                  alias:
                      typeItem.alias === undefined || typeItem.alias === null || String(typeItem.alias).trim() === ''
                          ? null
                          : String(typeItem.alias).trim(),
                  stockQuantity: typeItem.stockQuantity === '' || typeItem.stockQuantity === null || typeItem.stockQuantity === undefined
                      ? null
                      : Number(typeItem.stockQuantity)
              }))
            : []
    };
};

export const ProductList = () => {
    const [searchValue, setSearchValue] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');

    const applySearch = () => {
        setAppliedSearch(String(searchValue || '').trim());
    };

    const resetSearch = () => {
        setSearchValue('');
        setAppliedSearch('');
    };

    const applyDetectedProductName = (productName) => {
        const safeName = String(productName || '').trim();
        setSearchValue(safeName);
        setAppliedSearch(safeName);
    };

    return (
        <List
            perPage={1000}
            pagination={false}
            sort={{ field: 'id', order: 'DESC' }}
            actions={
                <ProductListActions
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    onSearchSubmit={applySearch}
                    onSearchReset={resetSearch}
                />
            }
        >
            <ProductScannerSync onDetectProductName={applyDetectedProductName} />
            <ProductListContent searchTerm={appliedSearch} />
        </List>
    );
};

const ProductFormFields = () => (
    <>
        <TextInput source="name" label="Название" fullWidth validate={required()} />
        <TextInput source="description" label="Описание" fullWidth multiline minRows={4} />
        <TextInput
            source="applicationMethodChildren"
            label="Способ применения (дети)"
            fullWidth
            multiline
            minRows={3}
        />
        <TextInput
            source="applicationMethodAdults"
            label="Способ применения (взрослые)"
            fullWidth
            multiline
            minRows={3}
        />
        <TextInput
            source="diseases"
            label="Заболевания (через запятую или новую строку)"
            fullWidth
            multiline
            minRows={3}
            parse={(value) =>
                String(value || '')
                    .split(/\n|,|;/)
                    .map((item) => item.trim())
                    .filter(Boolean)
            }
            format={(value) => (Array.isArray(value) ? value.join(', ') : value || '')}
            validate={required()}
        />
        <TextInput source="contraindications" label="Противопоказания" fullWidth multiline minRows={3} validate={required()} />
        <TextInput source="videoUrl" label="Ссылка на видео" fullWidth />

        <ArrayInput source="types" label="Варианты товара" validate={required()}>
            <SimpleFormIterator inline>
                <Box sx={{ display: 'none' }}>
                    <TextInput source="id" />
                    <TextInput source="alias" />
                </Box>
                <TextInput source="type" label="Тип" validate={required()} />
                <NumberInput source="price" label="Цена" validate={required()} min={0} />
                <NumberInput
                    source="stockQuantity"
                    label="Остаток (пусто = бесконечность)"
                    min={0}
                    parse={(value) => (value === '' || value === null || value === undefined ? null : Number(value))}
                />
            </SimpleFormIterator>
        </ArrayInput>
    </>
);

export const ProductCreate = () => (
    <Create mutationMode="pessimistic" transform={transformProduct} redirect="list">
        <SimpleForm>
            <ProductFormFields />
        </SimpleForm>
    </Create>
);

export const ProductEdit = () => (
    <Edit mutationMode="pessimistic" transform={transformProduct}>
        <SimpleForm>
            <ProductFormFields />
        </SimpleForm>
    </Edit>
);

export const ProductShow = () => {
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('sm'));

    return (
        <Show>
            <SimpleShowLayout>
                <TextField source="id" label="ID" />
                <TextField source="name" label="Название" />
                <TextField source="description" label="Описание" />
                <TextField source="applicationMethodChildren" label="Применение (дети)" />
                <TextField source="applicationMethodAdults" label="Применение (взрослые)" />
                <TextField source="contraindications" label="Противопоказания" />
                <TextField source="videoUrl" label="Видео URL" />
                <FunctionField
                    label="Заболевания"
                    render={(record) => (Array.isArray(record.diseases) ? record.diseases.join(', ') : '')}
                />
                {isSmall ? (
                    <FunctionField
                        label="Типы"
                        render={(record) => {
                            const rows = Array.isArray(record?.types) ? record.types : [];
                            return (
                                <Stack spacing={1}>
                                    {rows.map((row, index) => (
                                        <Card key={`${row.code || row.type}-${index}`} variant="outlined" sx={{ borderRadius: 2 }}>
                                            <CardContent>
                                                <Typography variant="subtitle2">{row.type}</Typography>
                                                <Typography variant="body2">Цена: {row.price} ₸</Typography>
                                                <Typography variant="body2">
                                                    Остаток: {row.stockQuantity === null ? 'Бесконечность' : `${row.stockQuantity} шт.`}
                                                </Typography>
                                                <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                                                    {row.code}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            );
                        }}
                    />
                ) : (
                    <ArrayField source="types" label="Типы">
                        <Datagrid bulkActionButtons={false}>
                            <TextField source="type" label="Тип" />
                            <NumberField source="price" label="Цена" />
                            <FunctionField
                                label="Остаток"
                                render={(record) => (record.stockQuantity === null ? 'Бесконечность' : `${record.stockQuantity} шт.`)}
                            />
                            <TextField source="code" label="Код" />
                            <FunctionField
                                label="QR"
                                render={(record) => (
                                    <img
                                        src={record.qrCodeUrl}
                                        alt={record.code}
                                        width={96}
                                        height={96}
                                        loading="lazy"
                                        style={{ borderRadius: 8, background: '#fff' }}
                                    />
                                )}
                            />
                        </Datagrid>
                    </ArrayField>
                )}
            </SimpleShowLayout>
        </Show>
    );
};
