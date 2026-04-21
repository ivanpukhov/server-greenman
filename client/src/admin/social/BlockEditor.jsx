import { useMemo, useState } from 'react';
import { Alert, Box, Stack, TextField, Typography } from '@mui/material';

export default function BlockEditor({ value, onChange, label = 'Блоки (Editor.js JSON)', rows = 14 }) {
    const initial = useMemo(() => {
        if (!value) return '';
        if (typeof value === 'string') return value;
        try { return JSON.stringify(value, null, 2); } catch { return ''; }
    }, [value]);

    const [text, setText] = useState(initial);
    const [error, setError] = useState(null);

    const handle = (e) => {
        const v = e.target.value;
        setText(v);
        if (!v.trim()) {
            setError(null);
            onChange(null);
            return;
        }
        try {
            const parsed = JSON.parse(v);
            setError(null);
            onChange(parsed);
        } catch (err) {
            setError('Невалидный JSON: ' + err.message);
        }
    };

    return (
        <Stack spacing={1}>
            <Typography variant="caption">{label}</Typography>
            <TextField
                multiline
                rows={rows}
                value={text}
                onChange={handle}
                fullWidth
                placeholder='{"blocks":[{"type":"header","data":{"text":"Заголовок","level":2}},{"type":"paragraph","data":{"text":"Текст"}}]}'
            />
            {error && <Alert severity="error">{error}</Alert>}
        </Stack>
    );
}
