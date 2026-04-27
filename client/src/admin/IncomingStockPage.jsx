import { useMemo, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const IncomingStockPage = () => {
    const notify = useNotify();
    const [code, setCode] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [loading, setLoading] = useState(false);
    const [lastEntry, setLastEntry] = useState(null);

    const canSubmit = useMemo(() => {
        return String(code).trim().length > 0 && Number(quantity) > 0;
    }, [code, quantity]);

    const submitIncoming = async (event) => {
        event.preventDefault();

        if (!canSubmit || loading) {
            return;
        }

        setLoading(true);

        try {
            const token = adminAuthStorage.getToken();
            const response = await fetch(apiUrl('/admin/inventory/receive'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    code: String(code).trim(),
                    quantity: Number(quantity)
                })
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(body.message || 'Не удалось добавить приход товара');
            }

            setLastEntry(body.data);
            setCode('');
            setQuantity('1');
            notify('Приход товара успешно добавлен', { type: 'success' });
        } catch (error) {
            notify(error.message, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.015em' }}>
                    Приход товара
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Сканируйте код на упаковке, укажите количество и подтвердите добавление на склад.
                </Typography>
            </Box>

            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 3
                }}
            >
                <Box component="form" onSubmit={submitIncoming}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField
                            label="Код типа товара"
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                            placeholder="greenman-товар-тип"
                            fullWidth
                            autoFocus
                        />
                        <TextField
                            label="Количество"
                            type="number"
                            value={quantity}
                            onChange={(event) => setQuantity(event.target.value)}
                            inputProps={{ min: 1, step: 1 }}
                            sx={{ minWidth: 170 }}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={!canSubmit || loading}
                            sx={{ minWidth: 160, minHeight: 56 }}
                        >
                            Добавить
                        </Button>
                    </Stack>
                </Box>
            </Paper>

            {lastEntry && (
                <Alert severity="success" sx={{ borderRadius: 3 }}>
                    <strong>{lastEntry.productName}</strong> / {lastEntry.typeName} <br />
                    Добавлено: {lastEntry.addedQuantity} шт. <br />
                    Остаток: {lastEntry.stockStatus}
                </Alert>
            )}
        </Stack>
    );
};

export default IncomingStockPage;
