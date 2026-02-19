import React from 'react';
import {Link, useLocation} from 'react-router-dom';
import logo from '../../images/logo.svg';

const Footer = () => {
    const location = useLocation();
    const isNotAuthPage = location.pathname !== '/auth';

    if (isNotAuthPage) {
        return (
            <footer className="footer">
                <Link to='/' className="logo">
                    <img src={logo} alt="GreenMan"/>
                    <span>GreenMan</span>
                </Link>
                <div className="footer__links">
                    <a href="https://wa.me/77770978675" target="_blank" rel="noreferrer">WhatsApp</a>
                    <a href="https://www.instagram.com/greenman_kazakstan/" target="_blank" rel="noreferrer">Instagram</a>
                </div>
                <div className="footer__copyright">
                    © Работаем с 2018 года
                </div>
            </footer >
        );
    } else {
        return null;
    }
}

export default Footer;
