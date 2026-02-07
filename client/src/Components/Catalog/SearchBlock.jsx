import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Hook для программной навигации
import search from "../../images/search.svg";

const SearchBlock = () => {
    const [searchName, setSearchName] = useState('');
    const [searchDisease, setSearchDisease] = useState('');
    const [everActive, setEverActive] = useState({first: false, second: false});
    const navigate = useNavigate(); // Получаем функцию navigate для перенаправления

    const handleFocus = (inputName) => {
        setEverActive(prevState => ({ ...prevState, [inputName]: true }));
    };

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
                    style={{ padding: everActive.first ? '0 58px 0 10px' : '0 10px 0 58px'}}
                    onFocus={() => handleFocus('first')}
                />
                <div className="banner__btn" onClick={() => handleSearch('name', searchName)} style={{ right: everActive.first ? '26px' : 'initial' }}>
                    <img src={search} alt="Search"/>
                </div>
            </div>
            <div className="banner__input">
                <input
                    type="text"
                    value={searchDisease}
                    onChange={(e) => setSearchDisease(e.target.value)}
                    placeholder="Поиск по болезни"
                    style={{ padding: everActive.second ? '0 58px 0 10px' : '0 10px 0 58px'}}
                    onFocus={() => handleFocus('second')}
                />
                <div className="banner__btn" onClick={() => handleSearch('disease', searchDisease)} style={{ right: everActive.second ? '26px' : 'initial' }}>
                    <img src={search} alt="Search"/>
                </div>
            </div>
        </div>
    );
}

export default SearchBlock;
