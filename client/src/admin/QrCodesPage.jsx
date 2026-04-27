import { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const QrCodesPage = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const token = adminAuthStorage.getToken();
                const response = await fetch(apiUrl('/admin/inventory/qr-codes'), {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const body = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(body.message || 'Не удалось получить QR-коды');
                }

                setRows(Array.isArray(body.data) ? body.data : []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) {
        return (
            <Grid container spacing={2}>
                {Array.from({ length: 8 }).map((_, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                        <Card sx={{ borderRadius: 3 }}>
                            <CardContent>
                                <Stack spacing={1.2}>
                                    <Skeleton variant="text" height={24} />
                                    <Skeleton variant="rounded" height={180} />
                                    <Skeleton variant="text" />
                                    <Skeleton variant="text" width="70%" />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Stack spacing={2.5}>
            <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.015em' }}>
                    QR-коды товаров
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Используйте эти коды для сканирования и удобного приёма товара на складе.
                </Typography>
            </Box>

            <Grid container spacing={2}>
                {rows.map((row) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={row.id}>
                        <Card
                            variant="outlined"
                            sx={{
                                borderRadius: 3,
                                height: '100%',
                                transition: 'border-color 150ms ease',
                                '&:hover': {
                                    borderColor: 'primary.main'
                                }
                            }}
                        >
                            <CardContent>
                                <Stack spacing={1} alignItems="center">
                                    <Typography variant="subtitle1" align="center">
                                        {row.productName} - {row.typeName}
                                    </Typography>
                                    <img
                                        src={row.qrCodeUrl}
                                        alt={row.code}
                                        width={180}
                                        height={180}
                                        loading="lazy"
                                        style={{ borderRadius: 8, background: '#fff' }}
                                    />
                                    <Typography variant="caption" sx={{ wordBreak: 'break-all', textAlign: 'center' }}>
                                        {row.code}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Остаток: {row.stockStatus}
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Stack>
    );
};

export default QrCodesPage;
