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
    useInput,
    useRecordContext,
} from 'react-admin';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField as MuiTextField,
    Typography,
    useMediaQuery
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import { apiUrl } from '../../config/api';
import { adminAuthStorage } from '../authProvider';

const normalizeImageUrls = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(/\n|,|;/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const ProductImagePreview = ({ src, alt = '', size = 64 }) => {
    const imageUrl = String(src || '').trim();

    if (!imageUrl) {
        return (
            <Box
                sx={{
                    width: size,
                    height: size,
                    borderRadius: 2,
                    bgcolor: 'grey.100',
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <ImageOutlinedIcon fontSize="small" />
            </Box>
        );
    }

    return (
        <Box
            component="img"
            src={imageUrl}
            alt={alt}
            loading="lazy"
            sx={{
                width: size,
                height: size,
                borderRadius: 2,
                objectFit: 'cover',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.100'
            }}
        />
    );
};

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

const ProductImagesInput = ({ source = 'imageUrls' }) => {
    const { field } = useInput({ source });
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const imageUrls = normalizeImageUrls(field.value);

    const uploadImages = async (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = '';

        if (files.length === 0) {
            return;
        }

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            files.forEach((file) => formData.append('images', file));

            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl('/admin/products/images'), {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData
            });
            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(body.message || 'Не удалось загрузить изображения');
            }

            const uploaded = normalizeImageUrls(body?.data?.imageUrls);
            field.onChange([...imageUrls, ...uploaded]);
        } catch (uploadError) {
            setError(uploadError.message || 'Не удалось загрузить изображения');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (imageUrl) => {
        field.onChange(imageUrls.filter((item) => item !== imageUrl));
    };

    return (
        <Stack spacing={1.5}>
            <Box>
                <Button
                    component="label"
                    variant="outlined"
                    startIcon={uploading ? <CircularProgress size={16} /> : <AddPhotoAlternateOutlinedIcon />}
                    disabled={uploading}
                >
                    Загрузить картинки
                    <input type="file" accept="image/*" multiple hidden onChange={uploadImages} />
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    Можно выбрать несколько файлов. Первая картинка будет главной на сайте.
                </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            {imageUrls.length > 0 ? (
                <Grid container spacing={1.2}>
                    {imageUrls.map((imageUrl) => (
                        <Grid item xs={6} sm={4} md={3} lg={2} key={imageUrl}>
                            <Paper
                                variant="outlined"
                                sx={{
                                    position: 'relative',
                                    overflow: 'hidden',
                                    borderRadius: 2,
                                    bgcolor: 'background.default'
                                }}
                            >
                                <Box
                                    component="img"
                                    src={imageUrl}
                                    alt=""
                                    loading="lazy"
                                    sx={{
                                        display: 'block',
                                        width: '100%',
                                        aspectRatio: '1 / 1',
                                        objectFit: 'cover'
                                    }}
                                />
                                <IconButton
                                    size="small"
                                    aria-label="Удалить картинку"
                                    onClick={() => removeImage(imageUrl)}
                                    sx={{
                                        position: 'absolute',
                                        top: 6,
                                        right: 6,
                                        bgcolor: 'rgba(255,255,255,0.92)',
                                        '&:hover': { bgcolor: 'background.paper' }
                                    }}
                                >
                                    <DeleteOutlineOutlinedIcon fontSize="small" />
                                </IconButton>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderStyle: 'dashed',
                        borderRadius: 2,
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}
                >
                    <ImageOutlinedIcon fontSize="small" />
                    <Typography variant="body2">Картинки пока не добавлены.</Typography>
                </Paper>
            )}
        </Stack>
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
                                    <CardContent sx={{ display: 'flex', gap: 1.5 }}>
                                        <ProductImagePreview src={normalizeImageUrls(record.imageUrls)[0]} alt={record.name} size={72} />
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="subtitle2" noWrap>{record.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Типов: {types.length}
                                            </Typography>
                                            <Typography variant="body2">
                                                Остаток: {totalStock === 'Бесконечность' ? totalStock : `${totalStock} шт.`}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                ID: {record.id}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        );
                    })}
                </Stack>
            ) : (
                <Datagrid rowClick="show" bulkActionButtons={false}>
                    <FunctionField
                        label=""
                        render={(record) => (
                            <ProductImagePreview src={normalizeImageUrls(record.imageUrls)[0]} alt={record.name} size={52} />
                        )}
                    />
                    <TextField source="id" label="ID" />
                    <TextField source="name" label="Название" />
                    <FunctionField
                        label="Картинки"
                        render={(record) => `${normalizeImageUrls(record.imageUrls).length} шт.`}
                    />
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
        imageUrls: normalizeImageUrls(data.imageUrls),
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

const ProductFormSection = ({ title, subtitle, children }) => (
    <Card variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2 }}>
        <Stack spacing={2}>
            <Box>
                <Typography variant="h6">{title}</Typography>
                {subtitle && (
                    <Typography variant="body2" color="text.secondary">
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {children}
        </Stack>
    </Card>
);

const ProductFormFields = () => (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
        <ProductFormSection title="Основное" subtitle="Название, описание и публичные медиа товара.">
            <TextInput source="name" label="Название" fullWidth validate={required()} />
            <TextInput source="description" label="Описание" fullWidth multiline minRows={4} />
            <ProductImagesInput source="imageUrls" />
            <TextInput source="videoUrl" label="Ссылка на видео" fullWidth />
        </ProductFormSection>

        <ProductFormSection title="Показания и применение" subtitle="Эти тексты показываются на странице товара.">
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
            <TextInput
                source="applicationMethodAdults"
                label="Способ применения (взрослые)"
                fullWidth
                multiline
                minRows={3}
            />
            <TextInput
                source="applicationMethodChildren"
                label="Способ применения (дети)"
                fullWidth
                multiline
                minRows={3}
            />
            <TextInput
                source="contraindications"
                label="Противопоказания"
                fullWidth
                multiline
                minRows={3}
                validate={required()}
            />
        </ProductFormSection>

        <ProductFormSection title="Варианты товара" subtitle="Форма, цена и складской остаток.">
            <ArrayInput source="types" label={false} validate={required()}>
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
        </ProductFormSection>
    </Stack>
);

export const ProductCreate = () => (
    <Create mutationMode="pessimistic" transform={transformProduct} redirect="list">
        <SimpleForm sx={{ maxWidth: 1120 }}>
            <ProductFormFields />
        </SimpleForm>
    </Create>
);

export const ProductEdit = () => (
    <Edit mutationMode="pessimistic" transform={transformProduct}>
        <SimpleForm sx={{ maxWidth: 1120 }}>
            <ProductFormFields />
        </SimpleForm>
    </Edit>
);

const ProductShowContent = () => {
    const record = useRecordContext();
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('sm'));

    if (!record) {
        return null;
    }

    const imageUrls = normalizeImageUrls(record.imageUrls);

    return (
        <Stack spacing={2.5}>
            <Card variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2 }}>
                <Grid container spacing={2.5}>
                    <Grid item xs={12} md={4}>
                        <Box
                            sx={{
                                borderRadius: 2,
                                overflow: 'hidden',
                                bgcolor: 'background.default',
                                border: '1px solid',
                                borderColor: 'divider',
                                aspectRatio: '1 / 1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {imageUrls[0] ? (
                                <Box
                                    component="img"
                                    src={imageUrls[0]}
                                    alt={record.name}
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <ImageOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
                            )}
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <Stack spacing={1.5}>
                            <Box>
                                <Typography variant="overline" color="text.secondary">ID {record.id}</Typography>
                                <Typography variant="h4" sx={{ fontWeight: 750 }}>
                                    {record.name}
                                </Typography>
                            </Box>
                            {record.description && (
                                <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                    {record.description}
                                </Typography>
                            )}
                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                <Chip label={`Картинки: ${imageUrls.length}`} />
                                <Chip label={`Варианты: ${Array.isArray(record.types) ? record.types.length : 0}`} />
                            </Stack>
                        </Stack>
                    </Grid>
                </Grid>
            </Card>

            {imageUrls.length > 1 && (
                <Card variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1.5 }}>Галерея</Typography>
                    <Grid container spacing={1.2}>
                        {imageUrls.map((imageUrl) => (
                            <Grid item xs={6} sm={4} md={2} key={imageUrl}>
                                <Box
                                    component="img"
                                    src={imageUrl}
                                    alt={record.name}
                                    loading="lazy"
                                    sx={{
                                        display: 'block',
                                        width: '100%',
                                        aspectRatio: '1 / 1',
                                        objectFit: 'cover',
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: 'background.default'
                                    }}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </Card>
            )}

            <Card variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2 }}>
                <SimpleShowLayout sx={{ p: 0 }}>
                    <TextField source="applicationMethodChildren" label="Применение (дети)" />
                    <TextField source="applicationMethodAdults" label="Применение (взрослые)" />
                    <TextField source="contraindications" label="Противопоказания" />
                    <TextField source="videoUrl" label="Видео URL" />
                    <FunctionField
                        label="Заболевания"
                        render={(item) => (Array.isArray(item.diseases) ? item.diseases.join(', ') : '')}
                    />
                </SimpleShowLayout>
            </Card>

            <Card variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 1.5 }}>Типы и QR</Typography>
                {isSmall ? (
                    <Stack spacing={1}>
                        {(Array.isArray(record?.types) ? record.types : []).map((row, index) => (
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
            </Card>
        </Stack>
    );
};

export const ProductShow = () => {
    return (
        <Show>
            <ProductShowContent />
        </Show>
    );
};
