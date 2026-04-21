import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import { adminSocialApi } from '../../../api/social';

export default function PostsTab() {
    const [items, setItems] = useState([]);
    const [text, setText] = useState('');
    const [mediaIds, setMediaIds] = useState('');
    const [publishedAt, setPublishedAt] = useState('');
    const [error, setError] = useState(null);

    const reload = async () => {
        try { setItems(await adminSocialApi.posts.list()); }
        catch (e) { setError(e.message); }
    };
    useEffect(() => { reload(); }, []);

    const create = async () => {
        try {
            const body = {
                text,
                mediaIds: mediaIds.split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean),
                publishedAt: publishedAt || new Date().toISOString(),
                isDraft: false
            };
            await adminSocialApi.posts.create(body);
            setText(''); setMediaIds(''); setPublishedAt('');
            await reload();
        } catch (e) { setError(e.message); }
    };

    const remove = async (id) => {
        if (!confirm('Удалить пост?')) return;
        try { await adminSocialApi.posts.remove(id); await reload(); }
        catch (e) { setError(e.message); }
    };

    const togglePublish = async (p) => {
        try {
            await adminSocialApi.posts.update(p.id, { isDraft: !p.isDraft, publishedAt: p.publishedAt || new Date().toISOString() });
            await reload();
        } catch (e) { setError(e.message); }
    };

    return (
        <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <Card>
                <CardContent>
                    <Typography variant="h6">Новый пост</Typography>
                    <Stack spacing={1}>
                        <TextField label="Текст" multiline rows={4} value={text} onChange={(e) => setText(e.target.value)} />
                        <TextField label="ID медиа (через запятую, из вкладки Медиа)" value={mediaIds} onChange={(e) => setMediaIds(e.target.value)} />
                        <TextField label="Опубликовано (ISO)" placeholder="оставьте пустым для сейчас" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
                        <Button variant="contained" onClick={create}>Опубликовать</Button>
                    </Stack>
                </CardContent>
            </Card>
            <Divider />
            <Typography variant="h6">Посты ({items.length})</Typography>
            {items.map((p) => (
                <Card key={p.id}>
                    <CardContent>
                        <Typography variant="caption">#{p.id} {p.isDraft ? '[Черновик]' : new Date(p.publishedAt).toLocaleString()}</Typography>
                        <Typography>{p.text}</Typography>
                        {p.media && p.media.length > 0 && (
                            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                                {p.media.map((m) => m.type === 'image' ? (
                                    <img key={m.id} src={m.url} alt="" style={{ maxHeight: 80 }} />
                                ) : (
                                    <Typography key={m.id} variant="caption">[{m.type} #{m.id}]</Typography>
                                ))}
                            </Stack>
                        )}
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button size="small" onClick={() => togglePublish(p)}>{p.isDraft ? 'Опубликовать' : 'В черновики'}</Button>
                            <Button size="small" color="error" onClick={() => remove(p.id)}>Удалить</Button>
                        </Stack>
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}
