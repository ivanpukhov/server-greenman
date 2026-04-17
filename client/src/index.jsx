import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/carousel/styles.css';
import './index.css';
import './ui/notifications.css';
import App from './App.jsx';
import reportWebVitals from './reportWebVitals';
import './i18n';
import { CartProvider } from './CartContext.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { CountryProvider } from './contexts/CountryContext.jsx';
import { RecentlyViewedProvider } from './contexts/RecentlyViewedContext.jsx';
import { WishlistProvider } from './contexts/WishlistContext.jsx';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import mantineTheme from './theme/mantineTheme.js';
import ErrorBoundary from './ErrorBoundary.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <MantineProvider theme={mantineTheme}>
        <Notifications position="top-right" limit={4} autoClose={3800} />
        <ErrorBoundary>
            <CountryProvider>
                <CartProvider>
                    <AuthProvider>
                        <WishlistProvider>
                            <RecentlyViewedProvider>
                                <App />
                            </RecentlyViewedProvider>
                        </WishlistProvider>
                    </AuthProvider>
                </CartProvider>
            </CountryProvider>
        </ErrorBoundary>
    </MantineProvider>,
);

reportWebVitals();
