import React, { forwardRef } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import styles from './Button.module.scss';

/**
 * Square icon-only button. Always accepts aria-label (or tooltip) — we require one for a11y.
 */
const IconButton = forwardRef(function IconButton(
    {
        children,
        label,
        tooltip,
        size = 'lg',
        variant = 'subtle',
        color = 'greenman',
        className = '',
        ...rest
    },
    ref,
) {
    const node = (
        <ActionIcon
            ref={ref}
            size={size}
            variant={variant}
            color={color}
            aria-label={label || tooltip}
            className={`${styles.btn} ${className}`}
            {...rest}
        >
            {children}
        </ActionIcon>
    );
    if (tooltip) {
        return (
            <Tooltip label={tooltip} withArrow openDelay={250}>
                {node}
            </Tooltip>
        );
    }
    return node;
});

export default IconButton;
