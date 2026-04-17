import React from 'react';
import PageContainer from './PageContainer';
import styles from './Section.module.scss';

/**
 * Vertical rhythm primitive. Standard page section with optional eyebrow, title, subtitle, trailing slot.
 */
export default function Section({
    eyebrow,
    title,
    subtitle,
    trailing,
    tone = 'default',
    spacing = 'md',
    container = 'xl',
    align = 'start',
    as: Tag = 'section',
    className = '',
    children,
    ...rest
}) {
    return (
        <Tag
            className={`${styles.root} ${styles[`tone-${tone}`]} ${styles[`spacing-${spacing}`]} ${className}`}
            {...rest}
        >
            <PageContainer size={container}>
                {(eyebrow || title || subtitle || trailing) && (
                    <header className={`${styles.head} ${styles[`align-${align}`]}`}>
                        <div className={styles.headText}>
                            {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
                            {title && <h2 className={styles.title}>{title}</h2>}
                            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                        </div>
                        {trailing && <div className={styles.trailing}>{trailing}</div>}
                    </header>
                )}
                {children}
            </PageContainer>
        </Tag>
    );
}
