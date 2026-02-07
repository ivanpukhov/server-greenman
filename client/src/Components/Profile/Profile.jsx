import React, {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import axios from 'axios';
import logoutImg from '../../images/logout.svg';
import icon from '../../images/profile.png';
import profile__order from '../../images/profile__order.png';
import {useAuth} from "../../AuthContext";
import Banner from "../Banner/Banner";
import {TailSpin} from "react-loader-spinner";
import ScrollToTop from "../ScrollToTop";

const Track = (order) => {
    return (
        <div className="profile-bottom__item">
            <div className="profile-bottom__title">Отследить заказ</div>
            <a href={'https://track.greenman.kz/' + order.trackingNumber} target="_blank"
               className="profile-bottom__btn">Подробнее</a>
        </div>
    )
}

const Profile = () => {
    const navigate = useNavigate();
    const {logout} = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [expandedOrders, setExpandedOrders] = useState({});
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth');
        }
    }, [navigate]);
    useEffect(() => {
        const token = localStorage.getItem('token');
        axios.get('/api/profile/', {headers: {'Authorization': `Bearer ${token}`}})
            .then(response => setProfileData(response.data))
            .catch(error => {
                console.error('Ошибка при получении данных профиля:', error);
                if (error.response && error.response.status === 401) {
                    logout();
                    navigate('/auth');
                }
            });
    }, [logout, navigate]);

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    const toggleOrderVisibility = (orderId) => {
        setExpandedOrders(prevState => ({
            ...prevState,
            [orderId]: !prevState[orderId]
        }));
    };

    return (
        <div>
            <ScrollToTop/>

            {profileData ? (
                profileData.orders.length > 0 ? (
                    <div className="profile">
                        <div className="profile__top">
                            <div className="profile__img">
                                <img src={icon} alt=""/>
                            </div>
                            <div className="profile__number">
                                Профиль
                                <p>+7{profileData.phoneNumber}</p>
                            </div>
                            <div className="profile__img" onClick={handleLogout}>
                                <img src={logoutImg} alt=""/>
                            </div>
                        </div>
                        <div className="profile__title">
                            Заказы
                        </div>
                        <div className="profile__orders">
                            {profileData.orders.map(order => (
                                <div key={order.id}
                                     className={`profile__order ${expandedOrders[order.id] ? 'expanded' : ''}`}>
                                    <div className="profile__order-status"
                                         onClick={() => toggleOrderVisibility(order.id)}>
                                        <img src={profile__order} alt="" className="img-pulse"/>
                                        <div className="profile__acc">
                                            {expandedOrders[order.id] ? '–' : '+'}
                                        </div>
                                        <div className="profile__order--status">
                                            <p>{order.status}</p>
                                            <span>№{order.id} {order.trackingNumber || 'Обрабатывается'}</span>
                                        </div>
                                    </div>
                                    {expandedOrders[order.id] && (
                                        <div className="profile__order-block">
                                            <div className="profile__order-item">
                                                <div className="profile__order-title">№ заказа</div>
                                                <div className="profile__order-content">{order.id}</div>
                                            </div>
                                            <div className="profile__order-item">
                                                <div className="profile__order-title">Трек номер:</div>
                                                <div
                                                    className="profile__order-content">{order.trackingNumber || 'Обрабатывается'}</div>
                                            </div>
                                            <ul className="profile-products">
                                                {order.products.map(product => (
                                                    <Link to={'/product/' + product.productId} key={product.productId}
                                                          className="profile-product">
                                                        <div
                                                            className="profile-product__title"> {product.product + ' ' + product.type}
                                                            <span>x{product.quantity} </span></div>
                                                        <div className="profile-product__title"></div>
                                                        <div className="profile-product__type"> Аннотация</div>
                                                    </Link>
                                                ))}
                                            </ul>
                                            <div className="profile-bottom">
                                                <div className="profile-bottom__item">
                                                    <div className="profile-bottom__title">Сумма заказа</div>
                                                    <div className="profile-bottom__text">{order.totalPrice} ₸</div>
                                                </div>
                                                {order.trackingNumber !== null && <Track order={order}/>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="cart__n">
                        <div className="cart__null">
                            <div className="cart__null-title">
                                У вас еще нет заказов
                            </div>
                            <div className="cart__null-text">
                                Выберите товар в каталоге, либо введите название товара или болезни в поиске, и выберите
                                то, что поможет именно Вам!
                            </div>
                            <Link to={'/'} className="cart__null--btn">На главную</Link>
                            <Link to={'/catalog'} className="cart__null--btn">Перейти в каталог</Link>
                        </div>
                    </div>
                )
            ) : (
                <div className="loading"><TailSpin color="#00AB6D" height={80} width={80}/></div>

            )}
            <Banner/>
        </div>
    );
};

export default Profile;
