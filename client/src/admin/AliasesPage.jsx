import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import {
    Box,
    Button,
    Card,
    CardContent,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useMediaQuery
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotify } from 'react-admin';
import { apiUrl } from '../config/api';
import { adminAuthStorage } from './authProvider';

const normalizeAliasInput = (value) => {
    const normalized = String(value || '').trim();
    return normalized.length > 0 ? normalized : null;
};

const AliasesPage = () => {
    const notify = useNotify();
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('md'));

    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [savingAll, setSavingAll] = useState(false);
    const [rows, setRows] = useState([]);
    const [query, setQuery] = useState('');
    const [drafts, setDrafts] = useState({});

    const loadData = useCallback(
        async (searchQuery = '') => {
            setLoading(true);

            try {
                const token = adminAuthStorage.getToken();
                const response = await fetch(apiUrl('/admin/inventory/qr-codes'), {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const body = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(body.message || 'Не удалось загрузить список псевдонимов');
                }

                const sourceRows = Array.isArray(body.data) ? body.data : [];
                const normalizedQuery = String(searchQuery || '').trim().toLowerCase();
                const filteredRows = normalizedQuery
                    ? sourceRows.filter((row) => {
                          const haystack = `${row.productName || ''} ${row.typeName || ''} ${row.alias || ''} ${row.code || ''}`
                              .trim()
                              .toLowerCase();
                          return haystack.includes(normalizedQuery);
                      })
                    : sourceRows;

                const sortedRows = filteredRows
                    .slice()
                    .sort((a, b) => {
                        const byProduct = String(a.productName || '').localeCompare(String(b.productName || ''), 'ru-RU');
                        if (byProduct !== 0) {
                            return byProduct;
                        }

                        const byType = String(a.typeName || '').localeCompare(String(b.typeName || ''), 'ru-RU');
                        if (byType !== 0) {
                            return byType;
                        }

                        return Number(a.id) - Number(b.id);
                    });

                setRows(sortedRows);
            } catch (error) {
                notify(error.message, { type: 'error' });
            } finally {
                setLoading(false);
            }
        },
        [notify]
    );

    useEffect(() => {
        loadData('');
    }, [loadData]);

    const changedRows = useMemo(() => {
        return rows.filter((row) => {
            if (!Object.prototype.hasOwnProperty.call(drafts, row.id)) {
                return false;
            }

            const draftAlias = normalizeAliasInput(drafts[row.id]);
            const currentAlias = normalizeAliasInput(row.alias);
            return draftAlias !== currentAlias;
        });
    }, [drafts, rows]);

    const changedCount = changedRows.length;

    const updateDraft = (id, value) => {
        setDrafts((prev) => ({
            ...prev,
            [id]: value
        }));
    };

    const saveAlias = useCallback(
        async (row) => {
            const nextAlias = normalizeAliasInput(
                Object.prototype.hasOwnProperty.call(drafts, row.id) ? drafts[row.id] : row.alias
            );
            const currentAlias = normalizeAliasInput(row.alias);

            if (nextAlias === currentAlias) {
                return;
            }

            setSavingId(row.id);

            try {
                const token = adminAuthStorage.getToken();
                const response = await fetch(apiUrl(`/admin/inventory/types/${row.id}/alias`), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ alias: nextAlias })
                });
                const body = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(body.message || 'Не удалось сохранить псевдоним');
                }

                const updatedRow = body.data || {};
                const updatedAlias = normalizeAliasInput(updatedRow.alias);

                setRows((prevRows) =>
                    prevRows.map((item) =>
                        Number(item.id) === Number(row.id)
                            ? {
                                  ...item,
                                  alias: updatedAlias
                              }
                            : item
                    )
                );

                setDrafts((prev) => {
                    const nextDrafts = { ...prev };
                    delete nextDrafts[row.id];
                    return nextDrafts;
                });
            } catch (error) {
                notify(error.message, { type: 'error' });
                throw error;
            } finally {
                setSavingId(null);
            }
        },
        [drafts, notify]
    );

    const saveAllChanged = async () => {
        if (savingAll || changedRows.length === 0) {
            return;
        }

        setSavingAll(true);

        let successCount = 0;
        for (const row of changedRows) {
            try {
                // Sequential save keeps feedback and prevents request spikes.
                await saveAlias(row);
                successCount += 1;
            } catch (_error) {
                // Errors are already shown in saveAlias.
            }
        }

        setSavingAll(false);

        if (successCount > 0) {
            notify(`Сохранено псевдонимов: ${successCount}`, { type: 'success' });
        }
    };

    const submitSearch = (event) => {
        event.preventDefault();
        loadData(query.trim());
    };

    return (
        <Stack spacing={2}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} gap={1.5}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">Псевдонимы товаров</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Псевдоним задается для конкретного типа товара. Пустое значение сохранится как NULL.
                        </Typography>
                    </Box>
                    <Box
                        component="form"
                        onSubmit={submitSearch}
                        sx={{ display: 'flex', gap: 1, width: { xs: '100%', md: 520 }, flexWrap: 'wrap' }}
                    >
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="Поиск по товару, типу, псевдониму или коду"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <Button type="submit" variant="contained" startIcon={<SearchOutlinedIcon />}>
                            Найти
                        </Button>
                        <Button
                            type="button"
                            variant="outlined"
                            onClick={() => loadData(query.trim())}
                            startIcon={<RefreshOutlinedIcon />}
                        >
                            Обновить
                        </Button>
                    </Box>
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Изменено: {changedCount}
                    </Typography>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<SaveOutlinedIcon />}
                        disabled={changedCount === 0 || savingAll}
                        onClick={saveAllChanged}
                    >
                        Сохранить все
                    </Button>
                </Stack>
            </Paper>

            <Paper sx={{ borderRadius: 2, overflow: 'hidden', p: isSmall ? 1.2 : 0 }}>
                {isSmall ? (
                    <Stack spacing={1.2}>
                        {rows.map((row) => {
                            const draftValue = Object.prototype.hasOwnProperty.call(drafts, row.id)
                                ? drafts[row.id]
                                : row.alias || '';
                            const isChanged = normalizeAliasInput(draftValue) !== normalizeAliasInput(row.alias);

                            return (
                                <Card key={row.id} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <CardContent>
                                        <Typography variant="subtitle2">{row.productName}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {row.typeName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                            #{row.productId}#{row.id}
                                        </Typography>

                                        <TextField
                                            label="Псевдоним"
                                            value={draftValue}
                                            onChange={(event) => updateDraft(row.id, event.target.value)}
                                            fullWidth
                                            size="small"
                                        />

                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                disabled={!isChanged || savingId === row.id || savingAll}
                                                onClick={() => saveAlias(row)}
                                            >
                                                Сохранить
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                disabled={savingId === row.id || savingAll}
                                                onClick={() => updateDraft(row.id, '')}
                                            >
                                                Очистить
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Stack>
                ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 980 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    <TableCell>Товар</TableCell>
                                    <TableCell>Тип</TableCell>
                                    <TableCell>Псевдоним</TableCell>
                                    <TableCell align="right">Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row) => {
                                    const draftValue = Object.prototype.hasOwnProperty.call(drafts, row.id)
                                        ? drafts[row.id]
                                        : row.alias || '';
                                    const isChanged = normalizeAliasInput(draftValue) !== normalizeAliasInput(row.alias);

                                    return (
                                        <TableRow key={row.id} hover>
                                            <TableCell>{row.productId}#{row.id}</TableCell>
                                            <TableCell>{row.productName}</TableCell>
                                            <TableCell>{row.typeName}</TableCell>
                                            <TableCell>
                                                <TextField
                                                    value={draftValue}
                                                    onChange={(event) => updateDraft(row.id, event.target.value)}
                                                    size="small"
                                                    fullWidth
                                                    placeholder="Псевдоним"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        disabled={!isChanged || savingId === row.id || savingAll}
                                                        onClick={() => saveAlias(row)}
                                                    >
                                                        Сохранить
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        disabled={savingId === row.id || savingAll}
                                                        onClick={() => updateDraft(row.id, '')}
                                                    >
                                                        Очистить
                                                    </Button>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!loading && rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Typography variant="body2" color="text.secondary">
                                                Данные не найдены
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Paper>
        </Stack>
    );
};

export default AliasesPage;
