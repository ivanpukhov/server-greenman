const toPlainObject = (value) => {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value !== 'object') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.slice(0, 5).map((item) => toPlainObject(item));
    }

    const result = {};
    Object.keys(value).slice(0, 12).forEach((key) => {
        const nestedValue = value[key];
        if (typeof nestedValue === 'function') {
            return;
        }
        result[key] = toPlainObject(nestedValue);
    });

    return result;
};

const buildErrorDetails = (error, depth = 0) => {
    if (!error) {
        return {
            name: 'Error',
            message: 'Неизвестная ошибка'
        };
    }

    const message = typeof error?.message === 'string' ? error.message.trim() : '';
    const details = {
        name: String(error?.name || 'Error'),
        message: message || null
    };

    [
        'code',
        'errno',
        'syscall',
        'hostname',
        'host',
        'port',
        'address',
        'status',
        'statusText'
    ].forEach((key) => {
        if (error?.[key] !== undefined && error?.[key] !== null && error[key] !== '') {
            details[key] = error[key];
        }
    });

    const responseData = error?.response?.data;
    if (responseData !== undefined) {
        details.responseData = toPlainObject(responseData);
    }

    if (typeof error?.stack === 'string' && error.stack.trim()) {
        details.stack = error.stack;
    }

    if (depth < 2 && error?.cause) {
        details.cause = buildErrorDetails(error.cause, depth + 1);
    }

    if (depth < 2 && Array.isArray(error?.errors) && error.errors.length > 0) {
        details.errors = error.errors.slice(0, 5).map((item) => buildErrorDetails(item, depth + 1));
    }

    return details;
};

const summarizeErrorDetails = (details) => {
    if (!details) {
        return 'Неизвестная ошибка';
    }

    if (details.message) {
        return details.message;
    }

    const parts = [details.name || 'Error'];
    ['code', 'errno', 'syscall', 'hostname', 'address', 'port', 'status'].forEach((key) => {
        if (details[key] !== undefined && details[key] !== null && details[key] !== '') {
            parts.push(`${key}=${details[key]}`);
        }
    });

    if (Array.isArray(details.errors) && details.errors.length > 0) {
        const nested = details.errors
            .map((item) => item?.message || item?.code || item?.name)
            .filter(Boolean)
            .join('; ');
        if (nested) {
            parts.push(`nested=[${nested}]`);
        }
    }

    if (details.cause) {
        const causeSummary = details.cause.message || details.cause.code || details.cause.name;
        if (causeSummary) {
            parts.push(`cause=${causeSummary}`);
        }
    }

    return parts.join(', ');
};

const formatErrorMessage = (error) => summarizeErrorDetails(buildErrorDetails(error));

module.exports = {
    buildErrorDetails,
    formatErrorMessage
};
