const axios = require('axios');
const { getToken, invalidateToken } = require('./tokenStore');
const { get: getSetting } = require('./settingsStore');
const { logError } = require('../../utilities/errorLogger');

const createClient = (baseURL) => {
    const instance = axios.create({ baseURL, timeout: 30000 });

    instance.interceptors.request.use(async (config) => {
        if (config.skipAuth) return config;
        const token = await getToken({ forceRefresh: config._forceRefresh === true });
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    instance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const status = error.response?.status;
            const originalConfig = error.config || {};
            if (status === 401 && !originalConfig._retriedAuth) {
                invalidateToken();
                originalConfig._retriedAuth = true;
                originalConfig._forceRefresh = true;
                try {
                    return await instance(originalConfig);
                } catch (retryError) {
                    logError('cdek.client.retryAuth', retryError, {
                        url: originalConfig.url,
                        method: originalConfig.method
                    });
                    throw retryError;
                }
            }
            return Promise.reject(error);
        }
    );

    return instance;
};

let clientInstance = null;
let cachedBaseUrl = null;

const getClient = async () => {
    const baseURL = ((await getSetting('CDEK_BASE_URL')) || '').replace(/\/$/, '');
    if (!clientInstance || cachedBaseUrl !== baseURL) {
        clientInstance = createClient(baseURL);
        cachedBaseUrl = baseURL;
    }
    return clientInstance;
};

module.exports = { getClient };
