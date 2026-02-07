import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import s from './Header.module.scss';
import logo from '../../images/logo.svg';
import search from '../../images/search.svg';
import hum from '../../images/hum.svg';
import Sheet from 'react-modal-sheet';
import SearchBlock from "../Catalog/SearchBlock";
import {useCart} from "../../CartContext.jsx";

const Header = () => {
    const location = useLocation();
    const isNotAuthPage = location.pathname !== '/auth';
    const [open, setOpen] = useState(false);  // Состояние для управления Sheet
    const {cart} = useCart();
    const totalItemsInCart = cart.reduce((total, item) => total + item.quantity, 0);

    const handleSearchClick = () => {
        setOpen(true);  // Открыть Sheet при клике на иконку поиска
    };

    if (isNotAuthPage) {
        return (
            <header className={s.header}>
                <Link to='/' className="logo">
                    <img src={logo} alt="greenman.kz" />
                    <span>GreenMan</span>
                </Link>
                <nav className={s.desktopNav}>
                    <NavLink to="/" className={({isActive}) => `${s.desktopNavItem} ${isActive ? s.desktopNavItemActive : ''}`}>Главная</NavLink>
                    <NavLink to="/catalog" className={({isActive}) => `${s.desktopNavItem} ${isActive ? s.desktopNavItemActive : ''}`}>Каталог</NavLink>
                    <NavLink to="/cart" className={({isActive}) => `${s.desktopNavItem} ${isActive ? s.desktopNavItemActive : ''}`}>
                        Корзина
                        {totalItemsInCart > 0 && <span className={s.cartBadge}>{totalItemsInCart}</span>}
                    </NavLink>
                    <NavLink to="/profile" className={({isActive}) => `${s.desktopNavItem} ${isActive ? s.desktopNavItemActive : ''}`}>Профиль</NavLink>
                </nav>
                <div className={s.right}>
                    <div className={s.search} onClick={handleSearchClick}>
                        <img src={search} alt=""/>
                    </div>
                    <div className={s.hum}>
                        <img src={hum} alt=""/>
                    </div>
                </div>
                <Sheet isOpen={open} onClose={() => setOpen(false)}>
                    <Sheet.Container style={{ maxHeight: '40vh' }}>
                        <Sheet.Header />
                        <Sheet.Content >
                            <div className='inmodal'>
                                <SearchBlock />
                            </div>

                        </Sheet.Content>
                    </Sheet.Container>
                    <Sheet.Backdrop />
                </Sheet>
            </header>
        );
    } else {
        return null;
    }
}

export default Header;
