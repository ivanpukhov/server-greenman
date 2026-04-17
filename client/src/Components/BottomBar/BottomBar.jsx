import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ActionIcon, Indicator, Text } from '@mantine/core';
import { useCart } from '../../CartContext.jsx';
import { useFormatPrice } from '../../contexts/CountryContext.jsx';
import iconHome from '../../images/bottom_bar/home.svg';
import iconHomeOp from '../../images/bottom_bar/homeOp.svg';
import iconCart from '../../images/bottom_bar/cart.svg';
import iconCartOp from '../../images/bottom_bar/cartOp.svg';
import iconCatalog from '../../images/bottom_bar/catalog.svg';
import iconCatalogOp from '../../images/bottom_bar/catalogOp.svg';
import iconProfile from '../../images/bottom_bar/profile.svg';
import iconProfileOp from '../../images/bottom_bar/profileOp.svg';

const BottomBar = () => {
    const { cart } = useCart();
    const formatPrice = useFormatPrice();
    const location = useLocation();

    const totalItemsInCart = cart.reduce((total, item) => total + item.quantity, 0);
    const totalItemsPriceInCart = cart.reduce((total, item) => total + item.type.price * item.quantity, 0);
    const isNotCartPage = location.pathname !== '/cart';
    const isNotAuthPage = location.pathname !== '/auth';
    const isNotProductPage = !/\/product\/.*/.test(location.pathname);

    if (!isNotAuthPage) return null;

    return (
        <div className="bar">
            {isNotCartPage && isNotProductPage && totalItemsInCart > 0 && (
                <Link to="cart" className="link__cart">
                    <div className="link__text">К оформлению</div>
                    <div className="link__data">
                        {totalItemsInCart} шт. {formatPrice(totalItemsPriceInCart)}
                    </div>
                </Link>
            )}

            <NavLink to="/" className="bar__item" end>
                {({ isActive }) => (
                    <>
                        <div className="bar__icon">
                            <img src={isActive ? iconHome : iconHomeOp} alt="Главная" />
                        </div>
                        <div className={`bar__text ${isActive ? 'bar__text-green' : ''}`}>Главная</div>
                    </>
                )}
            </NavLink>

            <NavLink to="/catalog" className="bar__item">
                {({ isActive }) => (
                    <>
                        <div className="bar__icon">
                            <img src={isActive ? iconCatalog : iconCatalogOp} alt="Каталог" />
                        </div>
                        <div className={`bar__text ${isActive ? 'bar__text-green' : ''}`}>Каталог</div>
                    </>
                )}
            </NavLink>

            <NavLink to="/cart" className="bar__item">
                {({ isActive }) => (
                    <>
                        <div className="bar__icon" style={{ position: 'relative' }}>
                            <Indicator
                                label={totalItemsInCart || ''}
                                size={16}
                                disabled={totalItemsInCart === 0}
                                color="greenman"
                                offset={2}
                            >
                                <img src={isActive ? iconCart : iconCartOp} alt="Корзина" />
                            </Indicator>
                        </div>
                        <div className={`bar__text ${isActive ? 'bar__text-green' : ''}`}>Корзина</div>
                    </>
                )}
            </NavLink>

            <NavLink to="/profile" className="bar__item">
                {({ isActive }) => (
                    <>
                        <div className="bar__icon">
                            <img src={isActive ? iconProfile : iconProfileOp} alt="Профиль" />
                        </div>
                        <div className={`bar__text ${isActive ? 'bar__text-green' : ''}`}>Профиль</div>
                    </>
                )}
            </NavLink>
        </div>
    );
};

export default BottomBar;
