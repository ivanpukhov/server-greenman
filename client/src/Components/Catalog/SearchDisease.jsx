import { useEffect, useState } from "react";
import axios from "axios";
import Product from "./Product";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet";

const SearchDisease = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { query } = useParams(); // Получаем параметр запроса из URL

    useEffect(() => {
        const fetchProductsByDisease = async () => {
            try {
                const response = await axios.post(`/api/products/search/disease`, { disease: query });
                setProducts(response.data);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        if (query) {
            fetchProductsByDisease();
        }
    }, [query]); // Обновление компонента при изменении запроса

    if (loading) return <div className="loading">Загрузка...</div>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div>
            <Helmet>
                <title>Поиск продуктов по болезни</title>
                <meta name="description" content="Поиск продуктов по специфическому запросу болезни в Greenman." />
            </Helmet>

            <h1>Результаты поиска для "{query}"</h1>
            {products.length > 0 ? (
                products.map(product => (
                    <Product key={product.id} product={product} />
                ))
            ) : (
                <p>Продукты не найдены.</p>
            )}
        </div>
    );
};

export default SearchDisease;
