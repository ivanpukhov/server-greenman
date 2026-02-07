const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_USER_KEY = 'admin_user';

const getErrorMessage = (responseBody, fallbackMessage) => {
    if (!responseBody) {
        return fallbackMessage;
    }

    if (typeof responseBody === 'string') {
        return responseBody;
    }

    return responseBody.message || fallbackMessage;
};

const authProvider = {
    login: async ({ phoneNumber, confirmationCode }) => {
        const response = await fetch('/api/admin/auth/confirm-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, confirmationCode })
        });

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(getErrorMessage(body, 'Не удалось выполнить вход'));
        }

        localStorage.setItem(ADMIN_TOKEN_KEY, body.token);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(body.user));
    },

    logout: async () => {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_USER_KEY);
    },

    checkAuth: async () => {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);

        if (!token) {
            throw new Error('Требуется авторизация');
        }
    },

    checkError: async (error) => {
        const status = error?.status;

        if (status === 401 || status === 403) {
            localStorage.removeItem(ADMIN_TOKEN_KEY);
            localStorage.removeItem(ADMIN_USER_KEY);
            throw new Error('Сессия истекла');
        }
    },

    getIdentity: async () => {
        const storedUser = localStorage.getItem(ADMIN_USER_KEY);
        const user = storedUser ? JSON.parse(storedUser) : null;

        if (!user) {
            throw new Error('Пользователь не найден');
        }

        return {
            id: user.id,
            fullName: `Админ +7${user.phoneNumber}`
        };
    },

    getPermissions: async () => 'admin'
};

export const adminAuthStorage = {
    getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY)
};

export default authProvider;
