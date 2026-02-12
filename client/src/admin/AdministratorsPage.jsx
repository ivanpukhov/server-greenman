import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useMediaQuery
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const IVAN_ADMIN_PHONE = '7073670497';
const DASHA_ADMIN_PHONE = '7077632624';
const normalizeAdminPhone = (rawPhone) => {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    if (digits.length === 10) {
        return digits;
    }
    if (digits.length === 11 && digits.startsWith('7')) {
        return digits.slice(1);
    }
    return '';
};
const canCurrentAdminSeeTargetAdmin = (currentAdminPhone, targetAdminPhone) => {
    const normalizedCurrentPhone = normalizeAdminPhone(currentAdminPhone);
    const normalizedTargetPhone = normalizeAdminPhone(targetAdminPhone);

    if (normalizedTargetPhone === IVAN_ADMIN_PHONE) {
        return normalizedCurrentPhone === IVAN_ADMIN_PHONE;
    }

    if (normalizedTargetPhone === DASHA_ADMIN_PHONE) {
        return normalizedCurrentPhone === IVAN_ADMIN_PHONE || normalizedCurrentPhone === DASHA_ADMIN_PHONE;
    }

    return true;
};

const AdministratorsPage = () => {
    const notify = useNotify();
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('md'));
    const [loading, setLoading] = useState(true);
    const [admins, setAdmins] = useState([]);
    const [paymentLinks, setPaymentLinks] = useState([]);
    const [addingAdmin, setAddingAdmin] = useState(false);
    const [editingAdminId, setEditingAdminId] = useState(null);
    const [updatingAdmin, setUpdatingAdmin] = useState(false);
    const [deletingAdminId, setDeletingAdminId] = useState(null);
    const [addingPaymentLink, setAddingPaymentLink] = useState(false);
    const [deletingPaymentLinkId, setDeletingPaymentLinkId] = useState(null);
    const [dispatchPlan, setDispatchPlan] = useState([]);
    const [savingDispatchPlan, setSavingDispatchPlan] = useState(false);
    const [insertPosition, setInsertPosition] = useState('end');
    const [insertRepeatCount, setInsertRepeatCount] = useState('1');
    const [adminForm, setAdminForm] = useState({
        fullName: '',
        phoneNumber: '',
        iin: ''
    });
    const [editAdminForm, setEditAdminForm] = useState({
        fullName: '',
        phoneNumber: '',
        iin: ''
    });
    const [paymentLinkForm, setPaymentLinkForm] = useState({
        url: '',
        adminPhone: ''
    });

    const currentAdminPhone = useMemo(() => {
        try {
            const rawUser = localStorage.getItem('admin_user');
            const user = rawUser ? JSON.parse(rawUser) : null;
            return normalizeAdminPhone(user?.phoneNumber);
        } catch (_error) {
            return '';
        }
    }, []);
    const visibleAdmins = useMemo(
        () => admins.filter((admin) => canCurrentAdminSeeTargetAdmin(currentAdminPhone, admin.phoneNumber)),
        [admins, currentAdminPhone]
    );
    const visiblePaymentLinks = useMemo(
        () => paymentLinks.filter((item) => canCurrentAdminSeeTargetAdmin(currentAdminPhone, item.adminPhone)),
        [paymentLinks, currentAdminPhone]
    );
    const dispatchPlanPreview = useMemo(() => {
        if (!dispatchPlan.length) {
            return '';
        }

        const nameByPhone = new Map(
            visibleAdmins.map((admin) => [normalizeAdminPhone(admin.phoneNumber), String(admin.fullName || admin.phoneNumber)])
        );

        return dispatchPlan
            .map((step) => {
                const stepPhone = normalizeAdminPhone(step.adminPhone);
                const adminName = nameByPhone.get(stepPhone) || `+7${stepPhone}`;
                const repeatCount = Math.max(1, Math.floor(Number(step.repeatCount) || 1));
                return `${adminName} x${repeatCount}`;
            })
            .join(' -> ');
    }, [dispatchPlan, visibleAdmins]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const token = adminAuthStorage.getToken();
            const headers = {
                Authorization: `Bearer ${token}`
            };

            const [adminsResponse, paymentLinksResponse, dispatchPlanResponse] = await Promise.all([
                fetch(apiUrl('/admin/admins?sort=%5B%22id%22%2C%22DESC%22%5D&range=%5B0%2C999%5D&filter=%7B%7D'), { headers }),
                fetch(apiUrl('/admin/accounting/payment-links'), { headers }),
                fetch(apiUrl('/admin/accounting/payment-link-dispatch-plan'), { headers })
            ]);

            const [adminsBody, paymentLinksBody, dispatchPlanBody] = await Promise.all([
                adminsResponse.json().catch(() => ({})),
                paymentLinksResponse.json().catch(() => ({})),
                dispatchPlanResponse.json().catch(() => ({}))
            ]);

            if (!adminsResponse.ok) {
                throw new Error(adminsBody.message || 'Ошибка загрузки администраторов');
            }
            if (!paymentLinksResponse.ok) {
                throw new Error(paymentLinksBody.message || 'Ошибка загрузки платежных ссылок');
            }
            if (!dispatchPlanResponse.ok) {
                throw new Error(dispatchPlanBody.message || 'Ошибка загрузки цепи отправки ссылок');
            }

            const adminsList = Array.isArray(adminsBody.data) ? adminsBody.data : [];
            const filteredAdmins = adminsList.filter((admin) =>
                canCurrentAdminSeeTargetAdmin(currentAdminPhone, admin.phoneNumber)
            );
            setAdmins(adminsList);
            setPaymentLinks(Array.isArray(paymentLinksBody.data) ? paymentLinksBody.data : []);
            const chain = Array.isArray(dispatchPlanBody?.data?.chain) ? dispatchPlanBody.data.chain : [];
            setDispatchPlan(
                chain.map((step) => ({
                    adminPhone: String(step.adminPhone || ''),
                    repeatCount: Math.max(1, Math.floor(Number(step.repeatCount) || 1))
                }))
            );
            setPaymentLinkForm((prev) => ({
                ...prev,
                adminPhone: prev.adminPhone || filteredAdmins[0]?.phoneNumber || ''
            }));
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [notify, currentAdminPhone]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!visibleAdmins.length) {
            return;
        }

        const isSelectedAdminVisible = visibleAdmins.some(
            (admin) => String(admin.phoneNumber) === String(paymentLinkForm.adminPhone || '')
        );

        if (!isSelectedAdminVisible) {
            setPaymentLinkForm((prev) => ({ ...prev, adminPhone: String(visibleAdmins[0].phoneNumber) }));
        }
    }, [visibleAdmins, paymentLinkForm.adminPhone]);

    const addAdminToDispatchPlan = (adminPhone) => {
        const normalizedPhone = normalizeAdminPhone(adminPhone);
        if (!normalizedPhone) {
            return;
        }

        const repeatCount = Math.max(1, Math.floor(Number(insertRepeatCount) || 1));
        const newStep = { adminPhone: normalizedPhone, repeatCount };

        setDispatchPlan((prev) => {
            const next = [...prev];
            if (insertPosition === 'start') {
                next.unshift(newStep);
                return next;
            }

            if (insertPosition === 'end') {
                next.push(newStep);
                return next;
            }

            const insertIndex = Math.max(0, Math.min(next.length, Number(insertPosition) || 0));
            next.splice(insertIndex, 0, newStep);
            return next;
        });
    };

    const updateDispatchStep = (index, patch) => {
        setDispatchPlan((prev) =>
            prev.map((step, stepIndex) => {
                if (stepIndex !== index) {
                    return step;
                }

                return { ...step, ...patch };
            })
        );
    };

    const removeDispatchStep = (index) => {
        setDispatchPlan((prev) => prev.filter((_, stepIndex) => stepIndex !== index));
    };

    const moveDispatchStep = (index, direction) => {
        setDispatchPlan((prev) => {
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= prev.length) {
                return prev;
            }

            const next = [...prev];
            const [moved] = next.splice(index, 1);
            next.splice(nextIndex, 0, moved);
            return next;
        });
    };

    const onSaveDispatchPlan = async () => {
        if (savingDispatchPlan) {
            return;
        }

        const chain = dispatchPlan
            .map((step) => ({
                adminPhone: normalizeAdminPhone(step.adminPhone),
                repeatCount: Math.max(1, Math.floor(Number(step.repeatCount) || 1))
            }))
            .filter((step) => step.adminPhone);

        setSavingDispatchPlan(true);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl('/admin/accounting/payment-link-dispatch-plan'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ chain })
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || 'Не удалось сохранить цепь отправки ссылок');
            }

            const savedChain = Array.isArray(body?.data?.chain) ? body.data.chain : [];
            setDispatchPlan(
                savedChain.map((step) => ({
                    adminPhone: String(step.adminPhone || ''),
                    repeatCount: Math.max(1, Math.floor(Number(step.repeatCount) || 1))
                }))
            );
            notify('Цепь отправки ссылок сохранена', { type: 'success' });
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setSavingDispatchPlan(false);
        }
    };

    const onSubmitAdmin = async (event) => {
        event.preventDefault();
        if (addingAdmin) {
            return;
        }

        const fullName = adminForm.fullName.trim();
        const phoneNumber = adminForm.phoneNumber.trim();
        const iin = String(adminForm.iin || '').replace(/\D/g, '');

        if (!fullName) {
            notify('Укажите имя администратора', { type: 'warning' });
            return;
        }
        if (!phoneNumber) {
            notify('Укажите номер телефона', { type: 'warning' });
            return;
        }

        setAddingAdmin(true);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl('/admin/admins'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    fullName,
                    phoneNumber,
                    iin
                })
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || 'Не удалось добавить администратора');
            }

            setAdminForm({ fullName: '', phoneNumber: '', iin: '' });
            notify('Администратор сохранен', { type: 'success' });
            await loadData();
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setAddingAdmin(false);
        }
    };

    const onDeleteAdmin = async (adminId) => {
        if (deletingAdminId) {
            return;
        }

        const confirmed = window.confirm('Удалить этого администратора?');
        if (!confirmed) {
            return;
        }

        setDeletingAdminId(adminId);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl(`/admin/admins/${adminId}`), {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || 'Не удалось удалить администратора');
            }

            notify('Администратор удален', { type: 'success' });
            await loadData();
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setDeletingAdminId(null);
        }
    };

    const onStartEditAdmin = (admin) => {
        setEditingAdminId(admin.id);
        setEditAdminForm({
            fullName: String(admin.fullName || ''),
            phoneNumber: String(admin.phoneNumber || ''),
            iin: String(admin.iin || '').replace(/\D/g, '').slice(0, 12)
        });
    };

    const onCancelEditAdmin = () => {
        if (updatingAdmin) {
            return;
        }
        setEditingAdminId(null);
        setEditAdminForm({
            fullName: '',
            phoneNumber: '',
            iin: ''
        });
    };

    const onSaveEditAdmin = async () => {
        if (!editingAdminId || updatingAdmin) {
            return;
        }

        const fullName = editAdminForm.fullName.trim();
        const phoneNumber = editAdminForm.phoneNumber.trim();
        const iin = String(editAdminForm.iin || '').replace(/\D/g, '');

        if (!fullName) {
            notify('Укажите имя администратора', { type: 'warning' });
            return;
        }

        if (!phoneNumber) {
            notify('Укажите номер телефона', { type: 'warning' });
            return;
        }

        setUpdatingAdmin(true);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl(`/admin/admins/${editingAdminId}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    fullName,
                    phoneNumber,
                    iin
                })
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || 'Не удалось обновить администратора');
            }

            notify('Администратор обновлен', { type: 'success' });
            setEditingAdminId(null);
            await loadData();
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setUpdatingAdmin(false);
        }
    };

    const onSubmitPaymentLink = async (event) => {
        event.preventDefault();
        if (addingPaymentLink) {
            return;
        }

        const url = paymentLinkForm.url.trim();
        if (!url) {
            notify('Укажите ссылку для оплаты', { type: 'warning' });
            return;
        }
        if (!paymentLinkForm.adminPhone) {
            notify('Выберите администратора', { type: 'warning' });
            return;
        }

        setAddingPaymentLink(true);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl('/admin/accounting/payment-links'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    url,
                    adminPhone: paymentLinkForm.adminPhone
                })
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || 'Не удалось сохранить ссылку');
            }

            setPaymentLinkForm((prev) => ({ ...prev, url: '' }));
            notify('Ссылка сохранена', { type: 'success' });
            await loadData();
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setAddingPaymentLink(false);
        }
    };

    const onDeletePaymentLink = async (linkId) => {
        if (deletingPaymentLinkId) {
            return;
        }

        const confirmed = window.confirm('Удалить эту платежную ссылку?');
        if (!confirmed) {
            return;
        }

        setDeletingPaymentLinkId(linkId);
        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl(`/admin/accounting/payment-links/${linkId}`), {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || 'Не удалось удалить ссылку');
            }

            notify('Ссылка удалена', { type: 'success' });
            await loadData();
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setDeletingPaymentLinkId(null);
        }
    };

    if (loading) {
        return <Typography>Загрузка администраторов...</Typography>;
    }

    return (
        <Stack spacing={2.5}>
            <Box
                sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 3,
                    border: '1px solid rgba(16,40,29,0.08)',
                    background: 'linear-gradient(135deg, rgba(20,76,112,0.14) 0%, rgba(39,108,176,0.12) 100%)'
                }}
            >
                <Typography variant="h5">Администраторы</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Здесь управляются номера, которым разрешен вход в админ-панель, и платежные ссылки.
                </Typography>
            </Box>

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Добавить администратора
                </Typography>
                <Box component="form" onSubmit={onSubmitAdmin}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                        <TextField
                            label="Имя"
                            value={adminForm.fullName}
                            onChange={(event) => setAdminForm((prev) => ({ ...prev, fullName: event.target.value }))}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Телефон (10 цифр без +7)"
                            value={adminForm.phoneNumber}
                            onChange={(event) => setAdminForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                            sx={{ minWidth: 260 }}
                            required
                        />
                        <TextField
                            label="ИИН (12 цифр, пусто = 000000000000)"
                            value={adminForm.iin}
                            onChange={(event) =>
                                setAdminForm((prev) => ({
                                    ...prev,
                                    iin: String(event.target.value || '')
                                        .replace(/\D/g, '')
                                        .slice(0, 12)
                                }))
                            }
                            sx={{ minWidth: 280 }}
                        />
                        <Button type="submit" variant="contained" disabled={addingAdmin}>
                            Сохранить
                        </Button>
                    </Stack>
                </Box>

                <Box sx={{ mt: 2 }}>
                    {isSmall ? (
                        <Stack spacing={1.2}>
                            {visibleAdmins.map((admin) => (
                                <Card key={admin.id} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <CardContent>
                                        <Stack spacing={1}>
                                            {editingAdminId === admin.id ? (
                                                <>
                                                    <TextField
                                                        size="small"
                                                        label="Имя"
                                                        value={editAdminForm.fullName}
                                                        onChange={(event) =>
                                                            setEditAdminForm((prev) => ({ ...prev, fullName: event.target.value }))
                                                        }
                                                    />
                                                    <TextField
                                                        size="small"
                                                        label="Телефон"
                                                        value={editAdminForm.phoneNumber}
                                                        onChange={(event) =>
                                                            setEditAdminForm((prev) => ({
                                                                ...prev,
                                                                phoneNumber: String(event.target.value || '')
                                                                    .replace(/\D/g, '')
                                                                    .slice(0, 10)
                                                            }))
                                                        }
                                                    />
                                                    <TextField
                                                        size="small"
                                                        label="ИИН"
                                                        value={editAdminForm.iin}
                                                        onChange={(event) =>
                                                            setEditAdminForm((prev) => ({
                                                                ...prev,
                                                                iin: String(event.target.value || '')
                                                                    .replace(/\D/g, '')
                                                                    .slice(0, 12)
                                                            }))
                                                        }
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <Typography variant="subtitle2">{admin.fullName}</Typography>
                                                    <Typography variant="body2">Телефон: +7{admin.phoneNumber}</Typography>
                                                    <Typography variant="body2">ИИН: {String(admin.iin || '').padStart(12, '0')}</Typography>
                                                </>
                                            )}
                                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                {editingAdminId === admin.id ? (
                                                    <>
                                                        <Button size="small" onClick={onSaveEditAdmin} disabled={updatingAdmin}>
                                                            Сохранить
                                                        </Button>
                                                        <Button size="small" onClick={onCancelEditAdmin} disabled={updatingAdmin}>
                                                            Отмена
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button size="small" onClick={() => onStartEditAdmin(admin)}>
                                                            Редактировать
                                                        </Button>
                                                        <Button
                                                            color="error"
                                                            size="small"
                                                            onClick={() => onDeleteAdmin(admin.id)}
                                                            disabled={deletingAdminId === admin.id || String(admin.phoneNumber) === currentAdminPhone}
                                                        >
                                                            Удалить
                                                        </Button>
                                                    </>
                                                )}
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    ) : (
                        <Box sx={{ overflowX: 'auto' }}>
                            <Table size="small" sx={{ minWidth: 860 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Имя</TableCell>
                                        <TableCell>Телефон</TableCell>
                                        <TableCell>ИИН</TableCell>
                                        <TableCell align="right">Действие</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {visibleAdmins.map((admin) => (
                                        <TableRow key={admin.id}>
                                            <TableCell>
                                                {editingAdminId === admin.id ? (
                                                    <TextField
                                                        size="small"
                                                        value={editAdminForm.fullName}
                                                        onChange={(event) =>
                                                            setEditAdminForm((prev) => ({ ...prev, fullName: event.target.value }))
                                                        }
                                                    />
                                                ) : (
                                                    admin.fullName
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingAdminId === admin.id ? (
                                                    <TextField
                                                        size="small"
                                                        value={editAdminForm.phoneNumber}
                                                        onChange={(event) =>
                                                            setEditAdminForm((prev) => ({
                                                                ...prev,
                                                                phoneNumber: String(event.target.value || '')
                                                                    .replace(/\D/g, '')
                                                                    .slice(0, 10)
                                                            }))
                                                        }
                                                    />
                                                ) : (
                                                    `+7${admin.phoneNumber}`
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingAdminId === admin.id ? (
                                                    <TextField
                                                        size="small"
                                                        value={editAdminForm.iin}
                                                        onChange={(event) =>
                                                            setEditAdminForm((prev) => ({
                                                                ...prev,
                                                                iin: String(event.target.value || '')
                                                                    .replace(/\D/g, '')
                                                                    .slice(0, 12)
                                                            }))
                                                        }
                                                    />
                                                ) : (
                                                    String(admin.iin || '').padStart(12, '0')
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                {editingAdminId === admin.id ? (
                                                    <>
                                                        <Button size="small" onClick={onSaveEditAdmin} disabled={updatingAdmin}>
                                                            Сохранить
                                                        </Button>
                                                        <Button size="small" onClick={onCancelEditAdmin} disabled={updatingAdmin}>
                                                            Отмена
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button size="small" onClick={() => onStartEditAdmin(admin)}>
                                                            Редактировать
                                                        </Button>
                                                        <Button
                                                            color="error"
                                                            size="small"
                                                            onClick={() => onDeleteAdmin(admin.id)}
                                                            disabled={deletingAdminId === admin.id || String(admin.phoneNumber) === currentAdminPhone}
                                                        >
                                                            Удалить
                                                        </Button>
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}
                </Box>
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Конструктор отправки ссылок
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Цепь работает по кругу. Каждый шаг: администратор + количество повторов.
                </Typography>
                <Stack spacing={1.5}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                        <TextField
                            label="Повторов для добавляемого шага"
                            value={insertRepeatCount}
                            onChange={(event) => setInsertRepeatCount(event.target.value)}
                            type="number"
                            inputProps={{ min: 1, step: 1 }}
                            sx={{ minWidth: 220 }}
                        />
                        <FormControl sx={{ minWidth: 240 }}>
                            <InputLabel id="dispatch-insert-position-label">Куда вставить</InputLabel>
                            <Select
                                labelId="dispatch-insert-position-label"
                                label="Куда вставить"
                                value={insertPosition}
                                onChange={(event) => setInsertPosition(String(event.target.value || 'end'))}
                            >
                                <MenuItem value="start">В начало</MenuItem>
                                <MenuItem value="end">В конец</MenuItem>
                                {dispatchPlan.map((step, index) => (
                                    <MenuItem key={`insert-${index}`} value={String(index)}>
                                        {`Перед шагом ${index + 1}`}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {visibleAdmins.map((admin) => (
                            <Button
                                key={`dispatch-admin-${admin.phoneNumber}`}
                                variant="outlined"
                                onClick={() => addAdminToDispatchPlan(admin.phoneNumber)}
                            >
                                {admin.fullName}
                            </Button>
                        ))}
                    </Stack>

                    <TextField
                        label="Цепь (предпросмотр)"
                        value={dispatchPlanPreview}
                        fullWidth
                        multiline
                        minRows={2}
                        InputProps={{ readOnly: true }}
                    />

                    {isSmall ? (
                        <Stack spacing={1.2}>
                            {dispatchPlan.map((step, index) => (
                                <Card key={`dispatch-step-${index}`} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <CardContent>
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                            Шаг #{index + 1}
                                        </Typography>
                                        <Stack spacing={1}>
                                            <FormControl fullWidth size="small">
                                                <Select
                                                    value={String(step.adminPhone || '')}
                                                    onChange={(event) =>
                                                        updateDispatchStep(index, {
                                                            adminPhone: normalizeAdminPhone(event.target.value)
                                                        })
                                                    }
                                                >
                                                    {visibleAdmins.map((admin) => (
                                                        <MenuItem key={`step-admin-${admin.phoneNumber}`} value={admin.phoneNumber}>
                                                            {admin.fullName}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                            <TextField
                                                size="small"
                                                label="Повторов"
                                                type="number"
                                                value={step.repeatCount}
                                                onChange={(event) =>
                                                    updateDispatchStep(index, {
                                                        repeatCount: Math.max(1, Math.floor(Number(event.target.value) || 1))
                                                    })
                                                }
                                                inputProps={{ min: 1, step: 1 }}
                                            />
                                            <Stack direction="row" spacing={1}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => moveDispatchStep(index, -1)}
                                                    disabled={index === 0}
                                                >
                                                    <ArrowUpwardIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => moveDispatchStep(index, 1)}
                                                    disabled={index === dispatchPlan.length - 1}
                                                >
                                                    <ArrowDownwardIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={() => removeDispatchStep(index)}>
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    ) : (
                        <Box sx={{ overflowX: 'auto' }}>
                            <Table size="small" sx={{ minWidth: 760 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>#</TableCell>
                                        <TableCell>Администратор</TableCell>
                                        <TableCell>Повторов</TableCell>
                                        <TableCell align="right">Действия</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {dispatchPlan.map((step, index) => (
                                        <TableRow key={`dispatch-step-${index}`}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>
                                                <FormControl fullWidth size="small">
                                                    <Select
                                                        value={String(step.adminPhone || '')}
                                                        onChange={(event) =>
                                                            updateDispatchStep(index, {
                                                                adminPhone: normalizeAdminPhone(event.target.value)
                                                            })
                                                        }
                                                    >
                                                        {visibleAdmins.map((admin) => (
                                                            <MenuItem key={`step-admin-${admin.phoneNumber}`} value={admin.phoneNumber}>
                                                                {admin.fullName}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    value={step.repeatCount}
                                                    onChange={(event) =>
                                                        updateDispatchStep(index, {
                                                            repeatCount: Math.max(1, Math.floor(Number(event.target.value) || 1))
                                                        })
                                                    }
                                                    inputProps={{ min: 1, step: 1 }}
                                                    sx={{ maxWidth: 120 }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => moveDispatchStep(index, -1)}
                                                    disabled={index === 0}
                                                >
                                                    <ArrowUpwardIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => moveDispatchStep(index, 1)}
                                                    disabled={index === dispatchPlan.length - 1}
                                                >
                                                    <ArrowDownwardIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={() => removeDispatchStep(index)}>
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}

                    <Stack direction="row" justifyContent={{ xs: 'stretch', md: 'flex-end' }}>
                        <Button variant="contained" onClick={onSaveDispatchPlan} disabled={savingDispatchPlan}>
                            Сохранить цепь
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(16,40,29,0.08)' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Платежные ссылки (ссылка - администратор)
                </Typography>
                <Box component="form" onSubmit={onSubmitPaymentLink}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                        <TextField
                            label="Ссылка оплаты"
                            value={paymentLinkForm.url}
                            onChange={(event) => setPaymentLinkForm((prev) => ({ ...prev, url: event.target.value }))}
                            fullWidth
                            required
                        />
                        <FormControl sx={{ minWidth: 220 }}>
                            <InputLabel id="admin-page-payment-link-admin-label">Администратор</InputLabel>
                            <Select
                                labelId="admin-page-payment-link-admin-label"
                                label="Администратор"
                                value={paymentLinkForm.adminPhone}
                                onChange={(event) =>
                                    setPaymentLinkForm((prev) => ({ ...prev, adminPhone: String(event.target.value || '') }))
                                }
                            >
                                {visibleAdmins.map((admin) => (
                                    <MenuItem key={admin.phoneNumber} value={admin.phoneNumber}>
                                        {admin.fullName}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button type="submit" variant="contained" disabled={addingPaymentLink}>
                            Сохранить
                        </Button>
                    </Stack>
                </Box>

                <Box sx={{ mt: 2 }}>
                    {isSmall ? (
                        <Stack spacing={1.2}>
                            {visiblePaymentLinks.map((item) => (
                                <Card key={item.id} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <CardContent>
                                        <Typography variant="subtitle2" sx={{ wordBreak: 'break-all' }}>
                                            {item.url}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Администратор: {item.adminName}
                                        </Typography>
                                        <Button
                                            color="error"
                                            size="small"
                                            onClick={() => onDeletePaymentLink(item.id)}
                                            disabled={deletingPaymentLinkId === item.id}
                                            sx={{ mt: 1 }}
                                        >
                                            Удалить
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    ) : (
                        <Box sx={{ overflowX: 'auto' }}>
                            <Table size="small" sx={{ minWidth: 760 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Ссылка</TableCell>
                                        <TableCell>Администратор</TableCell>
                                        <TableCell align="right">Действие</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {visiblePaymentLinks.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.url}</TableCell>
                                            <TableCell>{item.adminName}</TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    color="error"
                                                    size="small"
                                                    onClick={() => onDeletePaymentLink(item.id)}
                                                    disabled={deletingPaymentLinkId === item.id}
                                                >
                                                    Удалить
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}
                </Box>
            </Paper>
        </Stack>
    );
};

export default AdministratorsPage;
