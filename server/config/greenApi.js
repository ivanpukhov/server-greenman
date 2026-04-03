const GREEN_API_URL = 'https://7700.api.greenapi.com';
const GREEN_API_MEDIA_URL = 'https://7700.media.greenapi.com';
const GREEN_API_ID_INSTANCE = '7700574891';
const GREEN_API_TOKEN_INSTANCE = '19a0c5e062164ca6a10a02585e6bb886e5802f6809794f70b4';

module.exports = {
    GREEN_API_URL: String(GREEN_API_URL || '').trim(),
    GREEN_API_MEDIA_URL: String(GREEN_API_MEDIA_URL || '').trim(),
    GREEN_API_ID_INSTANCE: String(GREEN_API_ID_INSTANCE || '').trim(),
    GREEN_API_TOKEN_INSTANCE: String(GREEN_API_TOKEN_INSTANCE || '').trim()
};
