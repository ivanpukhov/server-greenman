import React from 'react';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import EmptyState from './EmptyState';
import { Button } from '@mantine/core';

export default function ErrorState({
    title = 'Не удалось загрузить',
    description = 'Что-то пошло не так. Попробуйте ещё раз.',
    onRetry,
    retryLabel = 'Повторить',
    icon,
    ...rest
}) {
    return (
        <EmptyState
            tone="surface"
            title={title}
            description={description}
            icon={icon || <IconAlertCircle size={28} />}
            actions={
                onRetry && (
                    <Button
                        onClick={onRetry}
                        leftSection={<IconRefresh size={16} />}
                        variant="light"
                        color="greenman"
                    >
                        {retryLabel}
                    </Button>
                )
            }
            {...rest}
        />
    );
}
