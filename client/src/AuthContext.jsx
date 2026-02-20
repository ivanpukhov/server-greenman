// AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();
const TOKEN_KEY = 'token';
const USER_ID_KEY = 'userId';
const AUTH_DATE_KEY = 'siteAuthAt';
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export const useAuth = () => useContext(AuthContext);

const clearSiteAuthStorage = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(AUTH_DATE_KEY);
};

const parseAuthDate = (value) => {
    const timestamp = Number(value);
    if (Number.isFinite(timestamp) && timestamp > 0) {
        return timestamp;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
};

export const hasValidSiteSession = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
        return false;
    }

    const authDateRaw = localStorage.getItem(AUTH_DATE_KEY);
    if (!authDateRaw) {
        clearSiteAuthStorage();
        return false;
    }

    const authDate = parseAuthDate(authDateRaw);
    if (!authDate) {
        clearSiteAuthStorage();
        return false;
    }

    if (Date.now() - authDate > TWO_DAYS_MS) {
        clearSiteAuthStorage();
        return false;
    }

    return true;
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(() => hasValidSiteSession());

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (!hasValidSiteSession()) {
                setIsAuthenticated(false);
            }
        }, 60 * 1000);

        return () => clearInterval(intervalId);
    }, []);

    const login = (token) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(AUTH_DATE_KEY, String(Date.now()));
        setIsAuthenticated(true);
    };

    const logout = () => {
        clearSiteAuthStorage();
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
