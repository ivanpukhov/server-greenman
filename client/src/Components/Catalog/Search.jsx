import { useEffect, useState } from 'react';
import axios from 'axios';
import Product from './Product';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Center, Loader, Stack, Text, Title } from '@mantine/core';

const Search = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { type, query } = useParams();

    useEffect(() => {
        if (!query) return;
        setLoading(true);
        axios.get(`/api/products/search/${query}?type=${type}`)
            .then(res => {
                setProducts(Array.isArray(res.data) ? res.data : []);
                setLoading(false);
            })
            .catch(err => {
                if (err.response?.status === 404) {
                    setProducts([]);
                } else {
                    setError(err.message);
                }
                setLoading(false);
            });
    }, [query, type]);

    if (loading) return <Center py={60}><Loader color="greenman" size="lg" /></Center>;
    if (error) return <Center py={40}><Text c="red">{error}</Text></Center>;

    return (
        <div className="search-page">
            <Helmet>
                <title>{type === 'name' ? 'Поиск продуктов по имени' : 'Поиск продуктов по болезни'}</title>
                <meta name="description" content={`Поиск продуктов по ${type === 'name' ? 'имени' : 'болезни'} "${query}"`} />
            </Helmet>
            <Title order={2} className="search__title" mb="lg">
                Результаты поиска для «{query}»
            </Title>
            {products.length > 0 ? (
                <div className="product-list">
                    {products.map(product => (
                        <Product key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <Center py={48}>
                    <Stack align="center" gap="xs">
                        <Text size="2rem">🔍</Text>
                        <Text c="greenman" fw={500}>Продукты не найдены</Text>
                    </Stack>
                </Center>
            )}
        </div>
    );
};

export default Search;
