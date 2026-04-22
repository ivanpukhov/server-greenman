import {
    Datagrid,
    DateField,
    Edit,
    List,
    NumberInput,
    SelectInput,
    Show,
    ShowButton,
    SimpleForm,
    TextField,
    TextInput,
    useNotify,
    useRecordContext,
    useRefresh
} from 'react-admin';
import { useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Divider,
    Paper,
    Stack,
    Typography
} from '@mui/material';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MuiTextField from '@mui/material/TextField';
import { apiUrl } from '../../config/api';
import { adminAuthStorage } from '../authProvider';

const orderStatusChoices = [
    { id: 'в обработке', name: 'В обработке' },
    { id: 'Оплачено', name: 'Оплачено' },
    { id: 'Отправлено', name: 'Отправлено' },
    { id: 'Доставлено', name: 'Доставлено' },
    { id: 'Отменено', name: 'Отменено' }
];

const formatRub = (value) => `${Math.round(Number(value) || 0).toLocaleString('ru-RU')} ₽`;

const fetchAdmin = async (path, options = {}) => {
    const token = adminAuthStorage.getToken();
    const response = await fetch(apiUrl(path), {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(body.message || 'Не удалось выполнить запрос');
    }
    return body;
};

const openAdminPdf = async (path) => {
    const token = adminAuthStorage.getToken();
    const response = await fetch(apiUrl(path), {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Не удалось загрузить PDF');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
};

const CdekStatusField = () => {
    const record = useRecordContext();
    if (!record) return null;
    if (!record.cdekStatus) return <span style={{ color: '#6B7280' }}>—</span>;
    return <Chip size="small" label={record.cdekStatus} />;
};

const CdekNumberLink = () => {
    const record = useRecordContext();
    if (!record?.cdekNumber) return <span style={{ color: '#6B7280' }}>—</span>;
    return (
        <a
            href={`https://cdek.ru/ru/tracking?order_id=${encodeURIComponent(record.cdekNumber)}`}
            target="_blank"
            rel="noreferrer"
        >
            {record.cdekNumber}
        </a>
    );
};

export const OrderRfList = () => (
    <List
        perPage={10}
        sort={{ field: 'id', order: 'DESC' }}
        filters={[
            <TextInput key="q" source="q" label="Поиск (имя / телефон / трек)" alwaysOn />,
            <SelectInput key="status" source="status" label="Статус" choices={orderStatusChoices} />
        ]}
    >
        <Datagrid rowClick="edit" bulkActionButtons={false}>
            <TextField source="id" label="ID" />
            <TextField source="customerName" label="Клиент" />
            <TextField source="phoneNumber" label="Телефон" />
            <TextField source="cdekDeliveryMode" label="Тип доставки" />
            <TextField source="cdekAddress" label="Адрес / ПВЗ" />
            <TextField source="totalPrice" label="Сумма (₽)" />
            <TextField source="status" label="Статус" />
            <CdekStatusField label="СДЭК" />
            <CdekNumberLink label="№ СДЭК" />
            <DateField source="createdAt" label="Создан" showTime locales="ru-RU" />
            <ShowButton label="Детали" />
        </Datagrid>
    </List>
);

const IntakeDialog = ({ open, onClose, orderId, onSuccess }) => {
    const notify = useNotify();
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const [intakeDate, setIntakeDate] = useState(tomorrow.toISOString().slice(0, 10));
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('18:00');
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);

    const minDiffHours = () => {
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        return (eh * 60 + em - (sh * 60 + sm)) / 60;
    };

    const onSend = async () => {
        if (sending) return;
        if (minDiffHours() < 3) {
            notify('Интервал вызова курьера должен быть не меньше 3 часов', { type: 'warning' });
            return;
        }
        setSending(true);
        try {
            await fetchAdmin(`/admin/orders-rf/${orderId}/cdek/intake`, {
                method: 'POST',
                body: JSON.stringify({
                    intake_date: intakeDate,
                    intake_time_from: startTime,
                    intake_time_to: endTime,
                    comment
                })
            });
            notify('Курьер вызван', { type: 'success' });
            onSuccess?.();
            onClose();
        } catch (error) {
            notify(error.message || 'Не удалось вызвать курьера', { type: 'error' });
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Вызов курьера СДЭК</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <MuiTextField
                        label="Дата"
                        type="date"
                        value={intakeDate}
                        onChange={(e) => setIntakeDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />
                    <Stack direction="row" spacing={1.5}>
                        <MuiTextField
                            label="С"
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                        <MuiTextField
                            label="До"
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Stack>
                    <MuiTextField
                        label="Комментарий"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        multiline
                        minRows={2}
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Отмена</Button>
                <Button variant="contained" onClick={onSend} disabled={sending}>
                    Вызвать курьера
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const CdekActionsToolbar = () => {
    const record = useRecordContext();
    const notify = useNotify();
    const refresh = useRefresh();
    const [submitting, setSubmitting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [printingKind, setPrintingKind] = useState(null);
    const [intakeOpen, setIntakeOpen] = useState(false);

    if (!record) return null;

    const submitToCdek = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            await fetchAdmin(`/admin/orders-rf/${record.id}/cdek/submit`, { method: 'POST' });
            notify('Заказ отправлен в СДЭК', { type: 'success' });
            refresh();
        } catch (error) {
            notify(error.message || 'Ошибка отправки в СДЭК', { type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const refreshFromCdek = async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            await fetchAdmin(`/admin/orders-rf/${record.id}/cdek/refresh`);
            notify('Статус СДЭК обновлён', { type: 'success' });
            refresh();
        } catch (error) {
            notify(error.message || 'Не удалось обновить статус', { type: 'error' });
        } finally {
            setRefreshing(false);
        }
    };

    const printPdf = async (kind) => {
        if (printingKind) return;
        setPrintingKind(kind);
        try {
            await openAdminPdf(`/admin/orders-rf/${record.id}/cdek/print/${kind}.pdf`);
        } catch (error) {
            notify(error.message || 'Ошибка печати', { type: 'error' });
        } finally {
            setPrintingKind(null);
        }
    };

    return (
        <Paper sx={{ p: 2, borderRadius: 2.5, mb: 2, border: '1px solid rgba(16,40,29,0.08)' }}>
            <Stack spacing={1.2}>
                <Typography variant="subtitle1">Действия СДЭК</Typography>
                <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                    <Button
                        variant="contained"
                        startIcon={<SendOutlinedIcon />}
                        onClick={submitToCdek}
                        disabled={submitting || Boolean(record.cdekUuid)}
                    >
                        {record.cdekUuid ? 'Отправлено в СДЭК' : 'Отправить в СДЭК'}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshOutlinedIcon />}
                        onClick={refreshFromCdek}
                        disabled={refreshing || !record.cdekUuid}
                    >
                        Обновить статус
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<PrintOutlinedIcon />}
                        onClick={() => printPdf('barcode')}
                        disabled={!record.cdekUuid || printingKind === 'barcode'}
                    >
                        Штрихкод
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<PrintOutlinedIcon />}
                        onClick={() => printPdf('waybill')}
                        disabled={!record.cdekUuid || printingKind === 'waybill'}
                    >
                        Накладная
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<LocalShippingOutlinedIcon />}
                        onClick={() => setIntakeOpen(true)}
                        disabled={!record.cdekNumber}
                    >
                        Вызвать курьера
                    </Button>
                </Stack>
                <Divider />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.2 }}>
                    <Typography variant="body2">
                        UUID СДЭК: <b>{record.cdekUuid || '—'}</b>
                    </Typography>
                    <Typography variant="body2">
                        Номер СДЭК: <b>{record.cdekNumber || '—'}</b>
                    </Typography>
                    <Typography variant="body2">
                        Статус СДЭК: <b>{record.cdekStatus || '—'}</b>
                    </Typography>
                    <Typography variant="body2">
                        Город: <b>{record.cdekCityCode || '—'}</b>
                    </Typography>
                    <Typography variant="body2">
                        Режим: <b>{record.cdekDeliveryMode === 'pvz' ? 'Дверь-ПВЗ' : 'Дверь-дверь'}</b>
                    </Typography>
                    <Typography variant="body2">
                        Адрес: <b>{record.cdekAddress || '—'}</b>
                    </Typography>
                    <Typography variant="body2">
                        ПВЗ: <b>{record.cdekPvzName || record.cdekPvzCode || '—'}</b>
                    </Typography>
                    <Typography variant="body2">
                        Адрес ПВЗ: <b>{record.cdekPvzAddress || '—'}</b>
                    </Typography>
                    <Typography variant="body2">
                        Доставка: <b>{formatRub(record.cdekCalcPriceRub)}</b>
                    </Typography>
                </Box>
            </Stack>
            <IntakeDialog
                open={intakeOpen}
                onClose={() => setIntakeOpen(false)}
                orderId={record.id}
                onSuccess={refresh}
            />
        </Paper>
    );
};

export const OrderRfEdit = () => (
    <Edit mutationMode="pessimistic">
        <SimpleForm>
            <CdekActionsToolbar />
            <TextInput source="customerName" label="Клиент" fullWidth />
            <TextInput source="email" label="Email" fullWidth />
            <TextInput source="phoneNumber" label="Телефон" fullWidth />
            <TextInput source="cdekAddress" label="Адрес СДЭК" fullWidth />
            <NumberInput source="cdekCityCode" label="Код города СДЭК" />
            <TextInput source="cdekDeliveryMode" label="Режим доставки" fullWidth />
            <TextInput source="cdekPvzCode" label="Код ПВЗ" fullWidth />
            <TextInput source="cdekPvzName" label="Название ПВЗ" fullWidth />
            <TextInput source="cdekPvzAddress" label="Адрес ПВЗ" fullWidth />
            <NumberInput source="totalPrice" label="Сумма (₽)" min={0} />
            <NumberInput source="cdekCalcPriceRub" label="Стоимость доставки (₽)" min={0} />
            <SelectInput source="status" label="Статус заказа" choices={orderStatusChoices} />
            <TextInput source="cdekStatus" label="Статус СДЭК" fullWidth />
            <TextInput source="cdekTrackingNumber" label="Трек-номер" fullWidth />
        </SimpleForm>
    </Edit>
);

export const OrderRfShow = () => (
    <Show>
        <Box sx={{ p: 2 }}>
            <OrderRfShowContent />
        </Box>
    </Show>
);

const OrderRfShowContent = () => {
    const record = useRecordContext();
    if (!record) return null;
    const products = Array.isArray(record.products) ? record.products : [];

    return (
        <Stack spacing={2}>
            <CdekActionsToolbar />
            <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Stack spacing={0.5}>
                    <Typography variant="subtitle1">Получатель</Typography>
                    <Typography variant="body2">Имя: {record.customerName || '—'}</Typography>
                    <Typography variant="body2">Email: {record.email || '—'}</Typography>
                    <Typography variant="body2">Телефон: {record.phoneNumber || '—'}</Typography>
                </Stack>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Typography variant="subtitle1">Товары</Typography>
                {products.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Товары не добавлены</Typography>
                ) : (
                    <Stack spacing={1} sx={{ mt: 1 }}>
                        {products.map((p, idx) => (
                            <Box key={`${p.typeId || idx}-${idx}`}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {p.productName || 'Без названия'} / {p.typeName || '—'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Кол-во: {p.quantity || 1} | Цена (₸): {p.unitPriceKzt || 0}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Paper>
        </Stack>
    );
};
