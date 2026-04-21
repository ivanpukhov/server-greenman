import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import BlockEditor from '../BlockEditor';
import { adminSocialApi } from '../../../api/social';

const EMPTY = { title: '', slug: '', excerpt: '', coverMediaId: '', blocks: null, publishedAt: '', isDraft: false };

export default function ArticlesTab() {
    const [items, setItems] = useState([]);
    const [draft, setDraft] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState(null);

    const reload = async () => {
        try { setItems(await adminSocialApi.articles.list()); } catch (e) { setError(e.message); }
    };
    useEffect(() => { reload(); }, []);

    const save = async () => {
        try {
            const body = {
                title: draft.title,
                slug: draft.slug || undefined,
                excerpt: draft.excerpt,
                coverMediaId: draft.coverMediaId ? parseInt(draft.coverMediaId, 10) : null,
                blocks: draft.blocks,
                publishedAt: draft.isDraft ? null : (draft.publishedAt || new Date().toISOString()),
                isDraft: !!draft.isDraft
            };
            if (editingId) await adminSocialApi.articles.update(editingId, body);
            else await adminSocialApi.articles.create(body);
            setDraft(EMPTY); setEditingId(null);
            await reload();
        } catch (e) { setError(e.message); }
    };

    const edit = async (id) => {
        try {
            const a = await adminSocialApi.articles.get(id);
            setEditingId(id);
            setDraft({
                title: a.title || '',
                slug: a.slug || '',
                excerpt: a.excerpt || '',
                coverMediaId: a.coverMediaId || '',
                blocks: a.blocks || null,
                publishedAt: a.publishedAt || '',
                isDraft: !!a.isDraft
            });
        } catch (e) { setError(e.message); }
    };

    const remove = async (id) => {
        if (!confirm('Удалить статью?')) return;
        try { await adminSocialApi.articles.remove(id); await reload(); } catch (e) { setError(e.message); }
    };

    return (
        <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <Card>
                <CardContent>
                    <Typography variant="h6">{editingId ? `Редактирование #${editingId}` : 'Новая статья'}</Typography>
                    <Stack spacing={1}>
                        <TextField label="Заголовок" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                        <TextField label="Slug (опционально)" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
                        <TextField label="Анонс (excerpt)" multiline rows={2} value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
                        <TextField label="ID обложки (Media)" value={draft.coverMediaId} onChange={(e) => setDraft({ ...draft, coverMediaId: e.target.value })} />
                        <BlockEditor value={draft.blocks} onChange={(v) => setDraft((d) => ({ ...d, blocks: v }))} />
                        <TextField label="isDraft (1/0)" value={draft.isDraft ? '1' : '0'} onChange={(e) => setDraft({ ...draft, isDraft: e.target.value === '1' })} />
                        <Stack direction="row" spacing={1}>
                            <Button variant="contained" onClick={save}>{editingId ? 'Сохранить' : 'Создать'}</Button>
                            {editingId && <Button onClick={() => { setEditingId(null); setDraft(EMPTY); }}>Отмена</Button>}
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
            <Typography variant="h6">Статьи ({items.length})</Typography>
            {items.map((a) => (
                <Card key={a.id}>
                    <CardContent>
                        <Typography variant="caption">#{a.id} {a.slug} {a.isDraft ? '[Черновик]' : ''}</Typography>
                        <Typography variant="h6">{a.title}</Typography>
                        <Typography variant="body2">{a.excerpt}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button size="small" onClick={() => edit(a.id)}>Редактировать</Button>
                            <Button size="small" color="error" onClick={() => remove(a.id)}>Удалить</Button>
                        </Stack>
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}
