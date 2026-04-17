import React from 'react';
import { IconAlertTriangle, IconRefresh, IconBrandWhatsapp } from '@tabler/icons-react';
import styles from './ErrorBoundary.module.scss';

const WHATSAPP_URL = 'https://wa.me/77770000000';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        if (typeof window !== 'undefined' && window.console) {
            console.error('[ErrorBoundary]', error, info?.componentStack);
        }
    }

    handleRetry = () => {
        this.setState({ error: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className={styles.root} role="alert">
                <div className={styles.card}>
                    <div className={styles.iconWrap}>
                        <IconAlertTriangle size={32} />
                    </div>
                    <h1 className={styles.title}>Что-то пошло не так</h1>
                    <p className={styles.text}>
                        Попробуйте обновить страницу. Если ошибка повторится — напишите нам,
                        мы разберёмся.
                    </p>

                    <div className={styles.actions}>
                        <button className={styles.primary} onClick={this.handleReload}>
                            <IconRefresh size={18} />
                            Обновить страницу
                        </button>
                        <a
                            className={styles.secondary}
                            href={WHATSAPP_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <IconBrandWhatsapp size={18} />
                            Написать в WhatsApp
                        </a>
                    </div>

                    {import.meta.env?.DEV && (
                        <pre className={styles.debug}>{String(this.state.error?.stack || this.state.error)}</pre>
                    )}
                </div>
            </div>
        );
    }
}
