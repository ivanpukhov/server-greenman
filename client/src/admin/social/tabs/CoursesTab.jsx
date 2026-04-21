import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import BlockEditor from '../BlockEditor';
import { adminSocialApi } from '../../../api/social';

const EMPTY = {
    title: '', slug: '', shortDescription: '', descriptionBlocks: null,
    trailerMediaId: '', coverMediaId: '',
    priceCents: '0', currency: 'KZT', durationDays: '7',
    publishedAt: '', isDraft: false
};

export default function CoursesTab() {
    const [items, setItems] = useState([]);
    const [draft, setDraft] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState(null);

    const [daysOpen, setDaysOpen] = useState(null); // course id
    const [days, setDays] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [dayDraft, setDayDraft] = useState({ dayNumber: '', title: '', contentBlocks: null, isDraft: false });
    const [editingDayId, setEditingDayId] = useState(null);

    const [supportEnrollment, setSupportEnrollment] = useState(null);
    const [supportMessages, setSupportMessages] = useState([]);
    const [supportText, setSupportText] = useState('');

    const reload = async () => {
        try { setItems(await adminSocialApi.courses.list()); } catch (e) { setError(e.message); }
    };
    useEffect(() => { reload(); }, []);

    const save = async () => {
        try {
            const body = {
                title: draft.title,
                slug: draft.slug || undefined,
                shortDescription: draft.shortDescription,
                descriptionBlocks: draft.descriptionBlocks,
                trailerMediaId: draft.trailerMediaId ? parseInt(draft.trailerMediaId, 10) : null,
                coverMediaId: draft.coverMediaId ? parseInt(draft.coverMediaId, 10) : null,
                priceCents: parseInt(draft.priceCents, 10) || 0,
                currency: draft.currency || 'KZT',
                durationDays: parseInt(draft.durationDays, 10) || 1,
                publishedAt: draft.isDraft ? null : (draft.publishedAt || new Date().toISOString()),
                isDraft: !!draft.isDraft
            };
            if (editingId) await adminSocialApi.courses.update(editingId, body);
            else await adminSocialApi.courses.create(body);
            setDraft(EMPTY); setEditingId(null);
            await reload();
        } catch (e) { setError(e.message); }
    };

    const edit = async (id) => {
        try {
            const c = await adminSocialApi.courses.get(id);
            setEditingId(id);
            setDraft({
                title: c.title || '',
                slug: c.slug || '',
                shortDescription: c.shortDescription || '',
                descriptionBlocks: c.descriptionBlocks || null,
                trailerMediaId: c.trailerMediaId || '',
                coverMediaId: c.coverMediaId || '',
                priceCents: String(c.priceCents || 0),
                currency: c.currency || 'KZT',
                durationDays: String(c.durationDays || 1),
                publishedAt: c.publishedAt || '',
                isDraft: !!c.isDraft
            });
        } catch (e) { setError(e.message); }
    };

    const remove = async (id) => {
        if (!confirm('Удалить курс?')) return;
        try { await adminSocialApi.courses.remove(id); await reload(); } catch (e) { setError(e.message); }
    };

    const openDays = async (courseId) => {
        setDaysOpen(courseId);
        try {
            setDays(await adminSocialApi.courses.days(courseId));
            setEnrollments(await adminSocialApi.courses.enrollments(courseId));
        } catch (e) { setError(e.message); }
    };

    const saveDay = async () => {
        try {
            const body = {
                dayNumber: parseInt(dayDraft.dayNumber, 10),
                title: dayDraft.title,
                contentBlocks: dayDraft.contentBlocks,
                publishedAt: dayDraft.isDraft ? null : new Date().toISOString(),
                isDraft: !!dayDraft.isDraft
            };
            if (editingDayId) await adminSocialApi.courses.dayUpdate(daysOpen, editingDayId, body);
            else await adminSocialApi.courses.dayCreate(daysOpen, body);
            setDayDraft({ dayNumber: '', title: '', contentBlocks: null, isDraft: false });
            setEditingDayId(null);
            setDays(await adminSocialApi.courses.days(daysOpen));
        } catch (e) { setError(e.message); }
    };

    const editDay = (d) => {
        setEditingDayId(d.id);
        setDayDraft({
            dayNumber: String(d.dayNumber),
            title: d.title || '',
            contentBlocks: d.contentBlocks || null,
            isDraft: !!d.isDraft
        });
    };

    const removeDay = async (dayId) => {
        if (!confirm('Удалить день?')) return;
        try {
            await adminSocialApi.courses.dayRemove(daysOpen, dayId);
            setDays(await adminSocialApi.courses.days(daysOpen));
        } catch (e) { setError(e.message); }
    };

    const openSupport = async (enrollmentId) => {
        setSupportEnrollment(enrollmentId);
        try { setSupportMessages(await adminSocialApi.courses.supportList(enrollmentId)); }
        catch (e) { setError(e.message); }
    };

    const sendSupport = async () => {
        if (!supportText.trim()) return;
        try {
            await adminSocialApi.courses.supportSend(supportEnrollment, { text: supportText.trim() });
            setSupportText('');
            setSupportMessages(await adminSocialApi.courses.supportList(supportEnrollment));
        } catch (e) { setError(e.message); }
    };

    if (daysOpen) {
        return (
            <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                <Button onClick={() => { setDaysOpen(null); setDays([]); setEnrollments([]); setSupportEnrollment(null); }}>← К списку курсов</Button>
                <Typography variant="h6">Дни курса #{daysOpen}</Typography>
                <Card>
                    <CardContent>
                        <Typography variant="subtitle1">{editingDayId ? `Редактирование дня #${editingDayId}` : 'Новый день'}</Typography>
                        <Stack spacing={1}>
                            <TextField label="Номер дня" value={dayDraft.dayNumber} onChange={(e) => setDayDraft({ ...dayDraft, dayNumber: e.target.value })} />
                            <TextField label="Заголовок" value={dayDraft.title} onChange={(e) => setDayDraft({ ...dayDraft, title: e.target.value })} />
                            <BlockEditor value={dayDraft.contentBlocks} onChange={(v) => setDayDraft((d) => ({ ...d, contentBlocks: v }))} label="Контент (Editor.js JSON)" rows={10} />
                            <TextField label="isDraft (1/0)" value={dayDraft.isDraft ? '1' : '0'} onChange={(e) => setDayDraft({ ...dayDraft, isDraft: e.target.value === '1' })} />
                            <Stack direction="row" spacing={1}>
                                <Button variant="contained" onClick={saveDay}>{editingDayId ? 'Сохранить' : 'Создать'}</Button>
                                {editingDayId && <Button onClick={() => { setEditingDayId(null); setDayDraft({ dayNumber: '', title: '', contentBlocks: null, isDraft: false }); }}>Отмена</Button>}
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
                {days.map((d) => (
                    <Card key={d.id}>
                        <CardContent>
                            <Typography>День {d.dayNumber}: {d.title} {d.isDraft ? '[Черновик]' : ''}</Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <Button size="small" onClick={() => editDay(d)}>Редактировать</Button>
                                <Button size="small" color="error" onClick={() => removeDay(d.id)}>Удалить</Button>
                            </Stack>
                        </CardContent>
                    </Card>
                ))}
                <Divider />
                <Typography variant="h6">Записи на курс ({enrollments.length})</Typography>
                {enrollments.map((e) => (
                    <Card key={e.id}>
                        <CardContent>
                            <Typography>enrollment #{e.id} user #{e.userId} status: {e.status} startedAt: {e.startedAt ? new Date(e.startedAt).toLocaleString() : '—'}</Typography>
                            <Button size="small" onClick={() => openSupport(e.id)}>Открыть диалог</Button>
                        </CardContent>
                    </Card>
                ))}
                {supportEnrollment && (
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Диалог с куратором (enrollment #{supportEnrollment})</Typography>
                            <Stack spacing={1}>
                                {supportMessages.map((m) => (
                                    <Box key={m.id} sx={{ p: 1, bgcolor: m.senderType === 'admin' ? '#eef' : '#efe' }}>
                                        <Typography variant="caption">{m.senderType === 'admin' ? 'Куратор' : 'Пользователь'} · {new Date(m.createdAt).toLocaleString()}</Typography>
                                        <Typography>{m.text}</Typography>
                                    </Box>
                                ))}
                                <TextField multiline rows={2} value={supportText} onChange={(e) => setSupportText(e.target.value)} placeholder="Ответ пользователю" />
                                <Button variant="contained" onClick={sendSupport} disabled={!supportText.trim()}>Отправить</Button>
                            </Stack>
                        </CardContent>
                    </Card>
                )}
            </Stack>
        );
    }

    return (
        <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <Card>
                <CardContent>
                    <Typography variant="h6">{editingId ? `Редактирование #${editingId}` : 'Новый курс'}</Typography>
                    <Stack spacing={1}>
                        <TextField label="Название" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                        <TextField label="Slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
                        <TextField label="Короткое описание" value={draft.shortDescription} onChange={(e) => setDraft({ ...draft, shortDescription: e.target.value })} />
                        <TextField label="ID трейлера (Media)" value={draft.trailerMediaId} onChange={(e) => setDraft({ ...draft, trailerMediaId: e.target.value })} />
                        <TextField label="ID обложки (Media)" value={draft.coverMediaId} onChange={(e) => setDraft({ ...draft, coverMediaId: e.target.value })} />
                        <TextField label="Цена в копейках/тиын" value={draft.priceCents} onChange={(e) => setDraft({ ...draft, priceCents: e.target.value })} />
                        <TextField label="Валюта" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} />
                        <TextField label="Продолжительность (дней)" value={draft.durationDays} onChange={(e) => setDraft({ ...draft, durationDays: e.target.value })} />
                        <BlockEditor value={draft.descriptionBlocks} onChange={(v) => setDraft((d) => ({ ...d, descriptionBlocks: v }))} label="Описание курса (Editor.js JSON)" />
                        <TextField label="isDraft (1/0)" value={draft.isDraft ? '1' : '0'} onChange={(e) => setDraft({ ...draft, isDraft: e.target.value === '1' })} />
                        <Stack direction="row" spacing={1}>
                            <Button variant="contained" onClick={save}>{editingId ? 'Сохранить' : 'Создать'}</Button>
                            {editingId && <Button onClick={() => { setEditingId(null); setDraft(EMPTY); }}>Отмена</Button>}
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
            <Typography variant="h6">Курсы ({items.length})</Typography>
            {items.map((c) => (
                <Card key={c.id}>
                    <CardContent>
                        <Typography variant="caption">#{c.id} {c.slug} · {c.priceCents > 0 ? `${(c.priceCents / 100).toLocaleString()} ${c.currency}` : 'Бесплатно'} · {c.durationDays} дней {c.isDraft ? '[Черновик]' : ''}</Typography>
                        <Typography variant="h6">{c.title}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button size="small" onClick={() => edit(c.id)}>Редактировать</Button>
                            <Button size="small" onClick={() => openDays(c.id)}>Дни / Записи / Поддержка</Button>
                            <Button size="small" color="error" onClick={() => remove(c.id)}>Удалить</Button>
                        </Stack>
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}
