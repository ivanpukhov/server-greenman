import React, { forwardRef } from 'react';
import styles from './Card.module.scss';

/**
 * Branded card surface. Supports interactive hover lift, padded/flush modes.
 */
const Card = forwardRef(function Card(
    {
        as: Tag = 'div',
        padding = 'md',
        radius = 'lg',
        tone = 'default',
        interactive = false,
        elevated = false,
        className = '',
        children,
        ...rest
    },
    ref,
) {
    const cls = [
        styles.root,
        styles[`pad-${padding}`],
        styles[`radius-${radius}`],
        styles[`tone-${tone}`],
        interactive && styles.interactive,
        elevated && styles.elevated,
        className,
    ]
        .filter(Boolean)
        .join(' ');
    return (
        <Tag ref={ref} className={cls} {...rest}>
            {children}
        </Tag>
    );
});

export default Card;
