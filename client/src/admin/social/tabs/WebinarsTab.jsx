import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import BlockEditor from '../BlockEditor';
import { adminSocialApi } from '../../../api/social';

const EMPTY = { title: '', slug: '', descriptionBlocks: null, videoMediaId: '', coverMediaId: '', attachmentIds: '', publishedAt: '', isDraft: false };

export default function WebinarsTab() {
    const [items, setItems] = useState([]);
    const [draft, setDraft] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState(null);

    const reload = async () => {
        try { setItems(await adminSocialApi.webinars.list()); } catch (e) { setError(e.message); }
    };
    useEffect(() => { reload(); }, []);

    const save = async () => {
        try {
            const body = {
                title: draft.title,
                slug: draft.slug || undefined,
                descriptionBlocks: draft.descriptionBlocks,
                videoMediaId: draft.videoMediaId ? parseInt(draft.videoMediaId, 10) : null,
                coverMediaId: draft.coverMediaId ? parseInt(draft.coverMediaId, 10) : null,
                attachmentIds: draft.attachmentIds.split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean),
                publishedAt: draft.isDraft ? null : (draft.publishedAt || new Date().toISOString()),
                isDraft: !!draft.isDraft
            };
            if (editingId) await adminSocialApi.webinars.update(editingId, body);
            else await adminSocialApi.webinars.create(body);
            setDraft(EMPTY); setEditingId(null);
            await reload();
        } catch (e) { setError(e.message); }
    };

    const edit = async (id) => {
        try {
            const w = await adminSocialApi.webinars.get(id);
            setEditingId(id);
            setDraft({
                title: w.title || '',
                slug: w.slug || '',
                descriptionBlocks: w.descriptionBlocks || null,
                videoMediaId: w.videoMediaId || '',
                coverMediaId: w.coverMediaId || '',
                attachmentIds: (w.attachments || []).map((m) => m.id).join(','),
                publishedAt: w.publishedAt || '',
                isDraft: !!w.isDraft
            });
        } catch (e) { setError(e.message); }
    };

    const remove = async (id) => {
        if (!confirm('Удалить вебинар?')) return;
        try { await adminSocialApi.webinars.remove(id); await reload(); } catch (e) { setError(e.message); }
    };

    return (
        <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <Card>
                <CardContent>
                    <Typography variant="h6">{editingId ? `Редактирование #${editingId}` : 'Новый вебинар'}</Typography>
                    <Stack spacing={1}>
                        <TextField label="Заголовок" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                        <TextField label="Slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
                        <TextField label="ID видео (Media)" value={draft.videoMediaId} onChange={(e) => setDraft({ ...draft, videoMediaId: e.target.value })} />
                        <TextField label="ID обложки (Media)" value={draft.coverMediaId} onChange={(e) => setDraft({ ...draft, coverMediaId: e.target.value })} />
                        <TextField label="ID прикреплённых файлов (через запятую)" value={draft.attachmentIds} onChange={(e) => setDraft({ ...draft, attachmentIds: e.target.value })} />
                        <BlockEditor value={draft.descriptionBlocks} onChange={(v) => setDraft((d) => ({ ...d, descriptionBlocks: v }))} label="Описание (Editor.js JSON)" />
                        <TextField label="isDraft (1/0)" value={draft.isDraft ? '1' : '0'} onChange={(e) => setDraft({ ...draft, isDraft: e.target.value === '1' })} />
                        <Stack direction="row" spacing={1}>
                            <Button variant="contained" onClick={save}>{editingId ? 'Сохранить' : 'Создать'}</Button>
                            {editingId && <Button onClick={() => { setEditingId(null); setDraft(EMPTY); }}>Отмена</Button>}
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
            <Typography variant="h6">Вебинары ({items.length})</Typography>
            {items.map((w) => (
                <Card key={w.id}>
                    <CardContent>
                        <Typography variant="caption">#{w.id} {w.slug}</Typography>
                        <Typography variant="h6">{w.title}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button size="small" onClick={() => edit(w.id)}>Редактировать</Button>
                            <Button size="small" color="error" onClick={() => remove(w.id)}>Удалить</Button>
                        </Stack>
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}
