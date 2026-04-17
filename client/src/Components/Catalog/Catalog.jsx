import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../../config/api';
import Product from './Product';
import { Helmet } from 'react-helmet';
import { useLocation, useNavigate } from 'react-router-dom';
import { Center, Loader, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import back from '../../images/ion_arrow-back.svg';

const Catalog = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();
    const isCatalogPage = location.pathname === '/catalog';

    useEffect(() => {
        axios.get(apiUrl('/products'))
            .then(res => {
                setProducts(Array.isArray(res.data) ? res.data : []);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) return <Center py={60}><Loader color="greenman" size="lg" /></Center>;
    if (error) return <Center py={40}><Text c="red">{error}</Text></Center>;

    const productsWithTypes = products.filter(p => p.types && p.types.length > 0);

    return (
        <div className="catalog-page">
            {isCatalogPage && (
                <Helmet>
                    <title>Каталог Greenman — Натуральные лекарственные настойки и соки</title>
                    <meta name="description" content="Исследуйте наш каталог натуральных лекарственных настоек, соков и сиропов." />
                </Helmet>
            )}
            <div className="productInfo__header">
                <UnstyledButton className="productInfo__header--back" onClick={() => navigate(-1)}>
                    <img src={back} alt="" />
                </UnstyledButton>
                <h1 className="productInfo__header--title">Каталог</h1>
            </div>
            {productsWithTypes.length > 0 ? (
                <>
                    <h2 className="catalog-page__subtitle">Продукты</h2>
                    <div className="product-list">
                        {productsWithTypes.map(product => (
                            <Product key={product.id} product={product} />
                        ))}
                    </div>
                </>
            ) : (
                <Center py={48}>
                    <Stack align="center" gap="xs">
                        <Text size="2rem">🌿</Text>
                        <Text c="greenman" fw={500}>В каталоге нет продуктов</Text>
                    </Stack>
                </Center>
            )}
        </div>
    );
};

export default Catalog;
