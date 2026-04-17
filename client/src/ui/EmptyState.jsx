import React from 'react';
import styles from './EmptyState.module.scss';

export default function EmptyState({
    icon,
    illustration,
    title,
    description,
    actions,
    tone = 'default',
    size = 'md',
    className = '',
}) {
    return (
        <div className={`${styles.root} ${styles[`tone-${tone}`]} ${styles[`size-${size}`]} ${className}`}>
            {illustration && <div className={styles.illustration}>{illustration}</div>}
            {!illustration && icon && <div className={styles.icon}>{icon}</div>}
            {title && <h3 className={styles.title}>{title}</h3>}
            {description && <p className={styles.description}>{description}</p>}
            {actions && <div className={styles.actions}>{actions}</div>}
        </div>
    );
}
