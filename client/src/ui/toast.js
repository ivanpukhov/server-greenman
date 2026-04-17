import { notifications } from '@mantine/notifications';
import React from 'react';
import {
    IconCheck,
    IconAlertTriangle,
    IconInfoCircle,
    IconX,
} from '@tabler/icons-react';

const ICON_SIZE = 18;

const base = {
    withBorder: true,
    autoClose: 3800,
    withCloseButton: true,
    radius: 'md',
};

function show({ title, message, variant, icon, autoClose, action }) {
    return notifications.show({
        ...base,
        autoClose: autoClose ?? base.autoClose,
        title,
        message: action
            ? React.createElement(
                  'span',
                  null,
                  message,
                  ' ',
                  React.createElement(
                      'a',
                      {
                          href: action.to || '#',
                          onClick: (e) => {
                              if (action.onClick) {
                                  e.preventDefault();
                                  action.onClick(e);
                              } else if (action.to) {
                                  e.preventDefault();
                                  window.history.pushState({}, '', action.to);
                                  window.dispatchEvent(new PopStateEvent('popstate'));
                              }
                          },
                          style: {
                              color: 'var(--color-brand-700)',
                              fontWeight: 600,
                              textDecoration: 'underline',
                              cursor: 'pointer',
                          },
                      },
                      action.label,
                  ),
              )
            : message,
        color:
            variant === 'success'
                ? 'greenman'
                : variant === 'error'
                  ? 'red'
                  : variant === 'warning'
                    ? 'yellow'
                    : variant === 'info'
                      ? 'blue'
                      : 'gray',
        icon,
    });
}

export const toast = {
    success: (message, opts = {}) =>
        show({
            message,
            variant: 'success',
            icon: React.createElement(IconCheck, { size: ICON_SIZE }),
            ...opts,
        }),
    error: (message, opts = {}) =>
        show({
            message,
            variant: 'error',
            icon: React.createElement(IconX, { size: ICON_SIZE }),
            autoClose: 5000,
            ...opts,
        }),
    warning: (message, opts = {}) =>
        show({
            message,
            variant: 'warning',
            icon: React.createElement(IconAlertTriangle, { size: ICON_SIZE }),
            ...opts,
        }),
    info: (message, opts = {}) =>
        show({
            message,
            variant: 'info',
            icon: React.createElement(IconInfoCircle, { size: ICON_SIZE }),
            ...opts,
        }),
    loading: (message, opts = {}) =>
        notifications.show({
            ...base,
            autoClose: false,
            message,
            loading: true,
            withCloseButton: false,
            color: 'greenman',
            ...opts,
        }),
    update: (id, payload) => notifications.update({ id, ...payload }),
    dismiss: (id) => notifications.hide(id),
    clean: () => notifications.clean(),
};

export default toast;
