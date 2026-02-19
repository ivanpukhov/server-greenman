import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Hook для программной навигации
import search from "../../images/search.svg";

const SearchBlock = () => {
    const [searchName, setSearchName] = useState('');
    const [searchDisease, setSearchDisease] = useState('');
    const navigate = useNavigate(); // Получаем функцию navigate для перенаправления

    const handleSearch = (type, query) => {
        // Осуществляем переход к соответствующей странице поиска
        if (query.trim() !== '') {
            navigate(`/search/${type}/${encodeURIComponent(query)}`);
        }
    };

    return (
        <div className="banner__form">
            <div className="banner__input">
                <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Поиск по названию"
                />
                <button type="button" className="banner__btn" onClick={() => handleSearch('name', searchName)}>
                    <img src={search} alt="Search"/>
                </button>
            </div>
            <div className="banner__input">
                <input
                    type="text"
                    value={searchDisease}
                    onChange={(e) => setSearchDisease(e.target.value)}
                    placeholder="Поиск по болезни"
                />
                <button type="button" className="banner__btn" onClick={() => handleSearch('disease', searchDisease)}>
                    <img src={search} alt="Search"/>
                </button>
            </div>
        </div>
    );
}

export default SearchBlock;
