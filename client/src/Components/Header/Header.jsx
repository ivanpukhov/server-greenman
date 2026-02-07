import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import s from './Header.module.scss';
import logo from '../../images/logo.svg';
import search from '../../images/search.svg';
import hum from '../../images/hum.svg';
import Sheet from 'react-modal-sheet';
import SearchBlock from "../Catalog/SearchBlock";

const Header = () => {
    const location = useLocation();
    const isNotAuthPage = location.pathname !== '/auth';
    const [open, setOpen] = useState(false);  // Состояние для управления Sheet

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
