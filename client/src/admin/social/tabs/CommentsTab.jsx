import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, MenuItem, Select, Stack, Typography } from '@mui/material';
import { adminSocialApi } from '../../../api/social';

const TYPES = [
    { value: '', label: 'Все' },
    { value: 'post', label: 'Посты' },
    { value: 'reel', label: 'Reels' },
    { value: 'article', label: 'Статьи' },
    { value: 'webinar', label: 'Вебинары' },
    { value: 'course_day', label: 'Дни курса' }
];

export default function CommentsTab() {
    const [type, setType] = useState('');
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);

    const reload = async () => {
        try { setItems(await adminSocialApi.comments.list({ type, limit: 200 })); }
        catch (e) { setError(e.message); }
    };
    useEffect(() => { reload(); }, [type]);

    const remove = async (id) => {
        if (!confirm('Удалить комментарий?')) return;
        try { await adminSocialApi.comments.remove(id); await reload(); }
        catch (e) { setError(e.message); }
    };

    return (
        <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="caption">Тип:</Typography>
                <Select size="small" value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPES.map((t) => (<MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>))}
                </Select>
                <Typography variant="caption">Всего: {items.length}</Typography>
            </Stack>
            {items.map((c) => (
                <Card key={c.id}>
                    <CardContent>
                        <Typography variant="caption">
                            #{c.id} · {c.commentableType}#{c.commentableId} · {new Date(c.createdAt).toLocaleString()} ·
                            {c.adminUserId ? ` admin#${c.adminUserId}` : ` user#${c.userId}`}
                        </Typography>
                        <Typography sx={{ mt: 1 }}>{c.body}</Typography>
                        <Button size="small" color="error" onClick={() => remove(c.id)} sx={{ mt: 1 }}>Удалить</Button>
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}
