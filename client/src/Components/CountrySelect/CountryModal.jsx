import React from 'react';
import { useCountry } from '../../contexts/CountryContext';
import s from './CountryModal.module.scss';

const CountryModal = () => {
    const { hasChosen, setCountry } = useCountry();

    if (hasChosen) return null;

    const handleSelect = (country) => {
        setCountry(country);
    };

    return (
        <div className={s.overlay} role="dialog" aria-modal="true">
            <div className={s.modal}>
                <h2 className={s.title}>Выберите страну</h2>
                <p className={s.subtitle}>От этого зависят цены, валюта и способы доставки</p>
                <div className={s.options}>
                    <button
                        type="button"
                        className={`${s.option} ${s.optionKz}`}
                        onClick={() => handleSelect('KZ')}
                    >
                        <span className={s.flag} aria-hidden="true">🇰🇿</span>
                        <span className={s.country}>Казахстан</span>
                        <span className={s.currency}>Цены в тенге · ₸</span>
                    </button>
                    <button
                        type="button"
                        className={s.option}
                        onClick={() => handleSelect('RF')}
                    >
                        <span className={s.flag} aria-hidden="true">🇷🇺</span>
                        <span className={s.country}>Россия</span>
                        <span className={s.currency}>Цены в рублях · ₽</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CountryModal;
