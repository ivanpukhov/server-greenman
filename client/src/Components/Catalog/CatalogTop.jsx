import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../../config/api';
import Product from './Product';
import { Center, Loader, Stack, Text } from '@mantine/core';

const CatalogTop = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios.get(apiUrl('/products'))
            .then(res => {
                const items = Array.isArray(res.data) ? res.data : [];
                setProducts(items.slice(0, 10));
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) return <Center py={40}><Loader color="greenman" size="md" /></Center>;
    if (error) return <Center py={20}><Text c="red">{error}</Text></Center>;

    if (products.length === 0) {
        return (
            <Center py={40}>
                <Stack align="center" gap="xs">
                    <Text size="2rem">🌿</Text>
                    <Text c="greenman" fw={500}>В каталоге нет продуктов</Text>
                </Stack>
            </Center>
        );
    }

    return (
        <div className="product-list">
            {products.map(product => (
                <Product key={product.id} product={product} />
            ))}
        </div>
    );
};

export default CatalogTop;
