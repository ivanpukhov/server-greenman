import React from 'react';
import {Link, NavLink, useLocation} from 'react-router-dom';
import { useCart } from '../../CartContext';

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
    const location = useLocation();

    const getIcon = (isActive, icon, iconOp) => {
        return isActive ? icon : iconOp;
    };

    const totalItemsInCart = cart.reduce((total, item) => total + item.quantity, 0);
    const totalItemsPriceInCart = cart.reduce((total, item) => total + item.type.price, 0);
    const isNotCartPage = location.pathname !== '/cart';
    const isNotAuthPage = location.pathname !== '/auth';
    const isNotProductPage = !/\/product\/.*/.test(location.pathname);

    if (isNotAuthPage) {
        return (
            <div className="bar">
                {isNotCartPage && isNotProductPage && totalItemsInCart > 0 && (
                    <Link to={'cart'} className="link__cart">
                        <div className="link__text">
                            К оформлению
                        </div>
                        <div className="link__data">
                            {totalItemsInCart} шт. {totalItemsPriceInCart} ₸
                        </div>
                    </Link>
                )}

                <NavLink to="/"  className="bar__item">
                    {({ isActive }) => (
                        <>
                            <div className="bar__icon">
                                <img src={getIcon(isActive, iconHome, iconHomeOp)} alt="Главная" />
                            </div>
                            <div className={`bar__text ${isActive ? 'bar__text-green' : ''}`}>
                                Главная
                            </div>
                        </>
                    )}
                </NavLink>

                <NavLink to="/catalog" className="bar__item">
                    {({ isActive }) => (
                        <>
                            <div className="bar__icon">
                                <img src={getIcon(isActive, iconCatalog, iconCatalogOp)} alt="Каталог" />
                            </div>
                            <div className={`bar__text ${isActive ? 'bar__text-green' : ''}`}>
                                Каталог
                            </div>
                        </>
                    )}
                </NavLink>

                <NavLink to="/cart" className="bar__item">
                    {({ isActive }) => (
                        <>
                            <div className="bar__icon">
                                <div className="cart__before">{totalItemsInCart}</div>
                                <img src={getIcon(isActive, iconCart, iconCartOp)} alt="Корзина" />
                            </div>
                            <div className={`bar__text ${isActive ? 'bar__text-green' : ''}`}>
                                Корзина
                            </div>
                        </>
                    )}
                </NavLink>

                <NavLink to="/profile" className="bar__item">
                    {({ isActive }) => (
                        <>
                            <div className="bar__icon">
                                <img src={getIcon(isActive, iconProfile, iconProfileOp)} alt="Профиль" />
                            </div>
                            <div className={`bar__text ${isActive ? 'bar__text-green' : ''}`}>
                                Профиль
                            </div>
                        </>
                    )}
                </NavLink>
            </div>
        );
    } else {
        return null;
    }
}

export default BottomBar;
