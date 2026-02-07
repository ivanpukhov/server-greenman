import React from 'react';
import {Link, useLocation} from 'react-router-dom';
import logo from '../../images/logo.svg';

const Footer = () => {
    const location = useLocation();
    const isNotAuthPage = location.pathname !== '/auth';

    if (isNotAuthPage) {
        return (
            <footer className="footer">
                {/*<Link to='/' className="logo">*/}
                {/*    <img src={logo} alt=""/>*/}
                {/*    <span>GreenMan</span>*/}
                {/*</Link>*/}
                {/*<div className="copyright">*/}
                {/*    © Работаем с 2018 года*/}
                {/*</div>*/}
            </footer >
        );
    } else {
        return null;
    }
}

export default Footer;
