import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import MediaUploader from '../MediaUploader';
import { adminSocialApi } from '../../../api/social';

export default function MediaTab() {
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);

    const reload = async () => {
        try { setItems(await adminSocialApi.listMedia({ limit: 100 })); }
        catch (e) { setError(e.message); }
    };
    useEffect(() => { reload(); }, []);

    const remove = async (id) => {
        if (!confirm('Удалить медиа?')) return;
        try { await adminSocialApi.deleteMedia(id); await reload(); }
        catch (e) { setError(e.message); }
    };

    return (
        <Stack spacing={2}>
            <MediaUploader label="Загрузить новое медиа" onUploaded={reload} />
            {error && <Alert severity="error">{error}</Alert>}
            <Typography variant="caption">Всего: {items.length}</Typography>
            <Grid container spacing={2}>
                {items.map((m) => (
                    <Grid item xs={6} sm={4} md={3} key={m.id}>
                        <Card>
                            <CardContent>
                                <Typography variant="caption">#{m.id} {m.type}</Typography>
                                {m.type === 'image' && <img src={m.url} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'cover' }} />}
                                {m.type === 'video' && <video src={m.url} style={{ width: '100%', maxHeight: 120 }} muted />}
                                <Typography variant="body2" noWrap>{m.originalName}</Typography>
                                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                                    <Button size="small" onClick={() => navigator.clipboard.writeText(String(m.id))}>Копировать ID</Button>
                                    <Button size="small" color="error" onClick={() => remove(m.id)}>Удалить</Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Stack>
    );
}
