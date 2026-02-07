import {useEffect, useState} from "react";
import axios from "axios";
import {useNavigate, useParams} from "react-router-dom";
import back from '../../images/ion_arrow-back.svg'
import children from '../../images/children.png'
import adults from '../../images/adults.png'
import FaqItem from "../FaqItem/FaqItem";
import AddToCartControl from "./AddToCartControl";
import {Helmet} from "react-helmet";
import ScrollToTop from "../ScrollToTop";

const ProductInfo = () => {
    const [product, setproduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    let {id} = useParams();
    let navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        axios.get(`/api/products/${id}`)
            .then(response => {
                setproduct(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Ошибка при получении данных о товаре:', error);
                setError('Ошибка при получении данных о товаре');
                setLoading(false);
            });
    }, [id]);

    const [isExpanded, setIsExpanded] = useState(false);


    if (loading) return <div>Загрузка...</div>;
    if (error) return <div>{error}</div>;
    if (!product) return <div>Данные о товаре не найдены.</div>;

    const formatDescription = (description, shouldShorten = false) => {
        const splitDescription = description.split(/[\•\*]/).map((item, index) => index === 0 ? item : `•${item}`).join('<br>');
        return shouldShorten ? splitDescription.slice(0, 300) + (splitDescription.length > 300 ? '...' : '') : splitDescription;
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };
    const truncateString = (str, num = 220) => {
        return str.length > num ? str.slice(0, num) + '...' : str;
    };


    return (
        <div className="productInfo">
            <Helmet>
                <title>{product.name} - Продукция Greenman</title>
                <meta name="description" content={truncateString(product.description, 160)}/>
                <meta name="keywords"
                      content={product.diseases && product.diseases.map(disease => disease).join(', ')}/>

                {/* Open Graph tags */}
                <meta property="og:title" content={`${product.name} - Продукция Greenman`}/>
                <meta property="og:description" content={truncateString(product.description, 200)}/>
                <meta property="og:type" content="product"/>
                <meta property="og:url" content={`https://greenman.kz/${product.id}`}/>
                <meta property="og:image" content={product.image}/>
                <meta property="og:site_name" content="Greenman"/>


                <meta name="robots" content="index, follow"/>
                <meta name="author" content="Greenman"/>
            </Helmet>
            <ScrollToTop/>
            <div className="productInfo__header">
                <div className="productInfo__header--back" onClick={() => navigate(-1)}>
                    <img src={back} alt=""/>
                </div>
                <h1 className="productInfo__header--title">
                    {product.name}
                </h1>
            </div>
            <div className="productInfo__desc">
                <h2 className="productInfo__desc--title">Описание</h2>
                <div className="productInfo__desc--content">
                    <div dangerouslySetInnerHTML={{__html: formatDescription(product.description, !isExpanded)}}/>
                    {product.description.length > 300 && (
                        <span onClick={toggleExpand}>
                            {isExpanded ? 'Скрыть' : 'Подробнее'}
                        </span>
                    )}
                </div>

            </div>

            <div className="productInfo__desc mt42">
                <h2 className="productInfo__desc--title">Для лечения</h2>
                {product.diseases && <ul className='diseases'>
                    {product.diseases.map((disease, index) => (
                        <li key={index} className="disease">{disease},</li>
                    ))}
                </ul>}

            </div>

            <div className="productInfo__desc mt42 contraindications">
                <h2 className="productInfo__desc--title">Противопоказания</h2>
                <ul className='diseases'>
                    <li className="disease ">{product.contraindications}</li>
                </ul>

            </div>
            <FaqItem question={'Способ применения для взрослых'} answer={product.applicationMethodAdults}
                     imageUrl={adults}/>
            <FaqItem question={'Способ применения для детей'} answer={product.applicationMethodChildren}
                     imageUrl={children}/>
            <div className="product__add">
                <AddToCartControl product={product}/>
            </div>


        </div>
    );
}

export default ProductInfo;
