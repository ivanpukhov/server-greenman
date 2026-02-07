import { useEffect, useState } from "react";
import axios from "axios";
import Product from "./Product";
import { Helmet } from "react-helmet";
import { useLocation, useNavigate } from "react-router-dom";
import { Empty } from 'antd';
import { TailSpin } from 'react-loader-spinner';
import back from "../../images/ion_arrow-back.svg";

const Catalog = () => {
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
                setProducts(response.data);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) return <div className="loading"><TailSpin color="#00AB6D" height={80} width={80} /></div>;
    if (error) return <p>Error: {error}</p>;

    // Разделяем продукты
    const productsWithTypes = products.filter(product => product.types && product.types.length > 0);
    const productsWithoutTypes = products.filter(product => !product.types || product.types.length === 0);

    return (
        <div>
            {isCatalogPage && (
                <>
                    <Helmet>
                        <title>Каталог Greenman - Натуральные лекарственные настойки и соки</title>
                        <meta name="description" content="Исследуйте наш каталог натуральных лекарственных настоек, соков и сиропов, изготовленных из чистых лечебных трав, корней и плодов. Найдите идеальные продукты для улучшения вашего здоровья и благополучия с Greenman." />
                    </Helmet>
                </>
            )}
            <div className="productInfo__header">
                <div className="productInfo__header--back" onClick={() => navigate(-1)}>
                    <img src={back} alt=""/>
                </div>
                <h1 className="productInfo__header--title">
                    Каталог
                </h1>
            </div>
            {productsWithTypes.length > 0 ? (
                <>
                    <h2>Продукты с типами</h2>
                    {productsWithTypes.map(product => (
                        <Product key={product.id} product={product} />
                    ))}
                </>
            ) : null}
            {productsWithoutTypes.length > 0 ? (
                <>
                   
                </>
            ) : (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    imageStyle={{
                        height: 60
                    }}
                    description={<span style={{ color: '#00AB6D' }}>В каталоге нет продуктов</span>}
                />
            )}
        </div>
    );
};

export default Catalog;
