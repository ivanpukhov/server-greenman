import { Card, CardContent, Grid, Typography } from '@mui/material';

const cardStyles = {
    borderRadius: 4,
    boxShadow: '0 16px 40px rgba(20,108,67,0.12)',
    border: '1px solid rgba(20,108,67,0.08)'
};

const AdminDashboard = () => (
    <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
            <Card sx={cardStyles}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Управление товарами
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Добавляйте, редактируйте и удаляйте позиции каталога, включая цены и варианты типов товара.
                    </Typography>
                </CardContent>
            </Card>
        </Grid>
        <Grid item xs={12} md={6}>
            <Card sx={cardStyles}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Управление заказами
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Смотрите все заказы, детали клиента, адреса, товары, сумму, статус и трек-номера.
                    </Typography>
                </CardContent>
            </Card>
        </Grid>
    </Grid>
);

export default AdminDashboard;
