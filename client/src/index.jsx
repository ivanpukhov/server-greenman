import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/carousel/styles.css';
import './index.css';
import App from './App.jsx';
import reportWebVitals from './reportWebVitals';
import './i18n';
import { CartProvider } from './CartContext.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { CountryProvider } from './contexts/CountryContext.jsx';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import mantineTheme from './theme/mantineTheme.js';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <MantineProvider theme={mantineTheme}>
        <Notifications position="top-right" />
        <CountryProvider>
            <CartProvider>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </CartProvider>
        </CountryProvider>
    </MantineProvider>
);

reportWebVitals();
