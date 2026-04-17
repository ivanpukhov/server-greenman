const axios = require('axios');
const { logError } = require('../../utilities/errorLogger');

const REFRESH_LEAD_TIME_MS = 120 * 1000;

let tokenState = { value: null, expiresAt: 0 };
let refreshPromise = null;

const fetchNewToken = async () => {
    const baseUrl = process.env.CDEK_BASE_URL;
    const clientId = process.env.CDEK_CLIENT_ID;
    const clientSecret = process.env.CDEK_CLIENT_SECRET;

    if (!baseUrl || !clientId || !clientSecret) {
        throw new Error('CDEK credentials are not configured (CDEK_BASE_URL, CDEK_CLIENT_ID, CDEK_CLIENT_SECRET)');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/oauth/token`;
    const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
    });

    const response = await axios.post(url, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000
    });

    const accessToken = response.data?.access_token;
    const expiresIn = Number(response.data?.expires_in) || 3600;
    if (!accessToken) {
        throw new Error('CDEK token response did not include access_token');
    }

    tokenState = {
        value: accessToken,
        expiresAt: Date.now() + expiresIn * 1000
    };

    return accessToken;
};

const getToken = async ({ forceRefresh = false } = {}) => {
    const now = Date.now();
    if (!forceRefresh && tokenState.value && now < tokenState.expiresAt - REFRESH_LEAD_TIME_MS) {
        return tokenState.value;
    }

    if (!refreshPromise) {
        refreshPromise = fetchNewToken()
            .catch((error) => {
                logError('cdek.token.refresh', error);
                throw error;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
};

const invalidateToken = () => {
    tokenState = { value: null, expiresAt: 0 };
};

module.exports = {
    getToken,
    invalidateToken
};
