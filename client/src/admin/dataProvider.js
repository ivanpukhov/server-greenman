import { fetchUtils } from 'react-admin';
import { adminAuthStorage } from './authProvider';
import { apiBaseUrl } from '../config/api';

const adminApiUrl = `${apiBaseUrl}/admin`;

const httpClient = async (url, options = {}) => {
    const token = adminAuthStorage.getToken();
    const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers || {});

    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    return fetchUtils.fetchJson(url, {
        ...options,
        headers
    });
};

const buildListQuery = (params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;

    return {
        sort: JSON.stringify([field, order]),
        range: JSON.stringify([(page - 1) * perPage, page * perPage - 1]),
        filter: JSON.stringify(params.filter || {})
    };
};

const dataProvider = {
    getList: async (resource, params) => {
        const query = new URLSearchParams(buildListQuery(params));
        const { json } = await httpClient(`${adminApiUrl}/${resource}?${query.toString()}`);

        return {
            data: json.data,
            total: json.total
        };
    },

    getOne: async (resource, params) => {
        const { json } = await httpClient(`${adminApiUrl}/${resource}/${params.id}`);

        return { data: json.data };
    },

    getMany: async (resource, params) => {
        const responses = await Promise.all(params.ids.map((id) => httpClient(`${adminApiUrl}/${resource}/${id}`)));

        return {
            data: responses.map((response) => response.json.data)
        };
    },

    getManyReference: async (resource, params) => {
        const query = new URLSearchParams(buildListQuery(params));
        query.set('filter', JSON.stringify({ ...(params.filter || {}), [params.target]: params.id }));

        const { json } = await httpClient(`${adminApiUrl}/${resource}?${query.toString()}`);

        return {
            data: json.data,
            total: json.total
        };
    },

    create: async (resource, params) => {
        const { json } = await httpClient(`${adminApiUrl}/${resource}`, {
            method: 'POST',
            body: JSON.stringify(params.data)
        });

        return { data: json.data };
    },

    update: async (resource, params) => {
        const { json } = await httpClient(`${adminApiUrl}/${resource}/${params.id}`, {
            method: 'PUT',
            body: JSON.stringify(params.data)
        });

        return { data: json.data };
    },

    updateMany: async (resource, params) => {
        await Promise.all(
            params.ids.map((id) =>
                httpClient(`${adminApiUrl}/${resource}/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(params.data)
                })
            )
        );

        return { data: params.ids };
    },

    delete: async (resource, params) => {
        const { json } = await httpClient(`${adminApiUrl}/${resource}/${params.id}`, {
            method: 'DELETE'
        });

        return { data: json.data };
    },

    deleteMany: async (resource, params) => {
        await Promise.all(
            params.ids.map((id) =>
                httpClient(`${adminApiUrl}/${resource}/${id}`, {
                    method: 'DELETE'
                })
            )
        );

        return { data: params.ids };
    }
};

export default dataProvider;
