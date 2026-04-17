import React, { forwardRef } from 'react';
import { Button as MantineButton } from '@mantine/core';
import styles from './Button.module.scss';

/**
 * Branded button wrapper. Adds press-scale feedback via a root class.
 * All Mantine Button props pass through unchanged.
 */
const Button = forwardRef(function Button(
    { variant = 'filled', color = 'greenman', className = '', children, ...rest },
    ref,
) {
    return (
        <MantineButton
            ref={ref}
            variant={variant}
            color={color}
            className={`${styles.btn} ${className}`}
            {...rest}
        >
            {children}
        </MantineButton>
    );
});

export default Button;
