import React from 'react';
import styles from './PageContainer.module.scss';

const SIZE_CLASS = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
    xl: styles.sizeXl,
    '2xl': styles.size2xl,
    full: styles.sizeFull,
};

export default function PageContainer({
    size = 'xl',
    as: Tag = 'div',
    className = '',
    children,
    noGutter = false,
    ...rest
}) {
    return (
        <Tag
            className={`${styles.root} ${SIZE_CLASS[size] || SIZE_CLASS.xl} ${noGutter ? styles.noGutter : ''} ${className}`}
            {...rest}
        >
            {children}
        </Tag>
    );
}
