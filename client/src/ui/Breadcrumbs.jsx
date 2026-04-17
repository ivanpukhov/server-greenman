import React from 'react';
import { Link } from 'react-router-dom';
import { IconChevronRight } from '@tabler/icons-react';
import styles from './Breadcrumbs.module.scss';

/**
 * items: [{ label: string, to?: string }]
 * Last item is rendered as current (non-link).
 */
export default function Breadcrumbs({ items = [], className = '' }) {
    if (!items.length) return null;
    return (
        <nav className={`${styles.root} ${className}`} aria-label="Хлебные крошки">
            <ol className={styles.list}>
                {items.map((item, i) => {
                    const isLast = i === items.length - 1;
                    return (
                        <li key={`${item.label}-${i}`} className={styles.item}>
                            {isLast || !item.to ? (
                                <span className={styles.current} aria-current="page">
                                    {item.label}
                                </span>
                            ) : (
                                <Link to={item.to} className={styles.link}>
                                    {item.label}
                                </Link>
                            )}
                            {!isLast && (
                                <IconChevronRight
                                    size={14}
                                    className={styles.separator}
                                    aria-hidden="true"
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
