import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { adminSocialApi } from '../../api/social';

export default function MediaUploader({ onUploaded, label = 'Загрузить файл' }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handle = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setError(null);
        try {
            const media = await adminSocialApi.uploadMedia(file);
            onUploaded && onUploaded(media);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <Stack spacing={1}>
            <Button variant="outlined" component="label" disabled={uploading}>
                {uploading ? 'Загружаю…' : label}
                <input type="file" hidden onChange={handle} />
            </Button>
            {error && <Typography color="error" variant="caption">{error}</Typography>}
        </Stack>
    );
}
