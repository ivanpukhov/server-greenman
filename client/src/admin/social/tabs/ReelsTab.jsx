import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { adminSocialApi } from '../../../api/social';

export default function ReelsTab() {
    const [items, setItems] = useState([]);
    const [videoMediaId, setVideoMediaId] = useState('');
    const [thumbnailMediaId, setThumbnailMediaId] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState(null);

    const reload = async () => {
        try { setItems(await adminSocialApi.reels.list()); } catch (e) { setError(e.message); }
    };
    useEffect(() => { reload(); }, []);

    const create = async () => {
        try {
            await adminSocialApi.reels.create({
                videoMediaId: parseInt(videoMediaId, 10),
                thumbnailMediaId: thumbnailMediaId ? parseInt(thumbnailMediaId, 10) : null,
                description,
                publishedAt: new Date().toISOString(),
                isDraft: false
            });
            setVideoMediaId(''); setThumbnailMediaId(''); setDescription('');
            await reload();
        } catch (e) { setError(e.message); }
    };

    const remove = async (id) => {
        if (!confirm('Удалить reel?')) return;
        try { await adminSocialApi.reels.remove(id); await reload(); } catch (e) { setError(e.message); }
    };

    return (
        <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <Card>
                <CardContent>
                    <Typography variant="h6">Новый reel</Typography>
                    <Stack spacing={1}>
                        <TextField label="ID видео (Media)" value={videoMediaId} onChange={(e) => setVideoMediaId(e.target.value)} />
                        <TextField label="ID превью (image Media, опционально)" value={thumbnailMediaId} onChange={(e) => setThumbnailMediaId(e.target.value)} />
                        <TextField label="Описание" multiline rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                        <Button variant="contained" onClick={create} disabled={!videoMediaId}>Опубликовать</Button>
                    </Stack>
                </CardContent>
            </Card>
            <Typography variant="h6">Reels ({items.length})</Typography>
            {items.map((r) => (
                <Card key={r.id}>
                    <CardContent>
                        <Typography variant="caption">#{r.id} просмотров: {r.viewCount}</Typography>
                        <Typography>{r.description}</Typography>
                        {r.video && <video src={r.video.url} style={{ maxHeight: 160 }} controls />}
                        <Button size="small" color="error" onClick={() => remove(r.id)}>Удалить</Button>
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}
