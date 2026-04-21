import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { adminSocialApi } from '../../../api/social';

export default function StoriesTab() {
    const [items, setItems] = useState([]);
    const [mediaId, setMediaId] = useState('');
    const [caption, setCaption] = useState('');
    const [durationSec, setDurationSec] = useState('10');
    const [days, setDays] = useState('1');
    const [error, setError] = useState(null);

    const reload = async () => {
        try { setItems(await adminSocialApi.stories.list()); } catch (e) { setError(e.message); }
    };
    useEffect(() => { reload(); }, []);

    const create = async () => {
        try {
            const now = Date.now();
            const expiresAt = new Date(now + (parseFloat(days || '1') * 86400000)).toISOString();
            await adminSocialApi.stories.create({
                mediaId: parseInt(mediaId, 10),
                caption,
                durationSec: parseInt(durationSec, 10) || 10,
                publishedAt: new Date(now).toISOString(),
                expiresAt
            });
            setMediaId(''); setCaption('');
            await reload();
        } catch (e) { setError(e.message); }
    };

    const remove = async (id) => {
        if (!confirm('Удалить сториз?')) return;
        try { await adminSocialApi.stories.remove(id); await reload(); } catch (e) { setError(e.message); }
    };

    return (
        <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <Card>
                <CardContent>
                    <Typography variant="h6">Новая сториз</Typography>
                    <Stack spacing={1}>
                        <TextField label="ID медиа (image/video)" value={mediaId} onChange={(e) => setMediaId(e.target.value)} />
                        <TextField label="Подпись" value={caption} onChange={(e) => setCaption(e.target.value)} />
                        <TextField label="Длительность показа (сек)" value={durationSec} onChange={(e) => setDurationSec(e.target.value)} />
                        <TextField label="Срок жизни (дни)" value={days} onChange={(e) => setDays(e.target.value)} />
                        <Button variant="contained" onClick={create} disabled={!mediaId}>Опубликовать</Button>
                    </Stack>
                </CardContent>
            </Card>
            <Typography variant="h6">Сториз ({items.length})</Typography>
            {items.map((s) => (
                <Card key={s.id}>
                    <CardContent>
                        <Typography variant="caption">#{s.id} истекает {new Date(s.expiresAt).toLocaleString()}</Typography>
                        {s.media?.type === 'image' && <img src={s.media.url} alt="" style={{ maxHeight: 160 }} />}
                        {s.media?.type === 'video' && <video src={s.media.url} style={{ maxHeight: 160 }} controls />}
                        <Typography>{s.caption}</Typography>
                        <Button size="small" color="error" onClick={() => remove(s.id)}>Удалить</Button>
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}
