import {useEffect, useState} from "react";
import axios from "axios";
import Product from "./Product";
import {Helmet} from "react-helmet";
import {useLocation, useNavigate} from "react-router-dom";
import {Empty} from 'antd';
import {TailSpin} from 'react-loader-spinner';


const CatalogTop = () => {
    const API_URL = "/api/products";
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();

    const isCatalogPage = location.pathname === '/catalog';

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get(API_URL);
                setProducts(response.data.slice(0, 10)); // Получаем только первые 10 товаров
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) return <div className="loading"><TailSpin color="#00AB6D" height={80} width={80}/></div>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div>
            {isCatalogPage && (
                <>
                    <Helmet>
                        <title>Каталог Greenman - Натуральные лекарственные настойки и соки</title>
                        <meta name="description"
                              content="Исследуйте наш каталог натуральных лекарственных настоек, соков и сиропов, изготовленных из чистых лечебных трав, корней и плодов. Найдите идеальные продукты для улучшения вашего здоровья и благополучия с Greenman."/>
                    </Helmet>
                </>
            )}

            {products.length > 0 ? (
                products.map(product => (
                    <Product key={product.id} product={product}/>
                ))
            ) : (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    imageStyle={{
                        height: 60
                    }}
                    description={<span style={{color: '#00AB6D'}}>В каталоге нет продуктов</span>}
                />
            )}
        </div>
    );
};

export default CatalogTop;
