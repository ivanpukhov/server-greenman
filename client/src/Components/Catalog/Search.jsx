import { useEffect, useState } from "react";
import axios from "axios";
import Product from "./Product";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { TailSpin } from 'react-loader-spinner';
import { Empty } from 'antd';

const Search = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { type, query } = useParams();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const url = `/api/products/search/${query}?type=${type}`;
                const response = await axios.get(url);
                setProducts(response.data);
                setLoading(false);
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    setProducts([]);
                } else {
                    setError(err.message);
                }
                setLoading(false);
            }
        };

        if (query) {
            fetchProducts();
        }
    }, [query, type]);

    if (loading) return <div className="loading"><TailSpin color="#00AB6D" height={80} width={80} /></div>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div>
            <Helmet>
                <title>{type === "name" ? "Поиск продуктов по имени" : "Поиск продуктов по болезни"}</title>
                <meta name="description" content={`Поиск продуктов по ${type === "name" ? "имени" : "болезни"} "${query}" в Greenman.`} />
            </Helmet>

            <h1 className="search__title">Результаты поиска для "{query}"</h1>
            {products.length > 0 ? (
                products.map(product => (
                    <Product key={product.id} product={product} />
                ))
            ) : (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    imageStyle={{
                        height: 60,
                        color: '#00AB6D'
                    }}
                    description={<span style={{ color: '#00AB6D' }}>Продукты не найдены</span>}
                />
            )}
        </div>
    );
};

export default Search;
