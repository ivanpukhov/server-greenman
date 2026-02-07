import React, { useState } from 'react';
import axios from 'axios';
import MaskedInput from 'react-text-mask';
import phone from '../../images/delivery__phone.png';
import s from './scss/Login.module.scss';

const PhoneAuth = ({ onCodeSent, phoneNumber: initialPhoneNumber }) => {
    const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || '');

    const formatPhoneNumber = (number) => {
        return number.replace(/[^\d]/g, '').slice(1); // Удаляем все нечисловые символы и первую цифру (+7)
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
        try {
            await axios.post('/api/auth/register-login', { phoneNumber: formattedPhoneNumber });
            onCodeSent(formattedPhoneNumber);
        } catch (error) {
            console.error('Ошибка при отправке номера телефона:', error);
        }
    };

    return (
        <div className={s.form}>
            <form onSubmit={handleSubmit}>
                <div className={s.title__sub}>
                    Вход
                </div>
                <label htmlFor="">
                    <img src={phone} alt=""/>
                    <MaskedInput
                        mask={['+', '7', ' ', '(', /\d/, /\d/, /\d/, ')', ' ', /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/]}
                        className="form-control"
                        placeholder="+7 (000) 000-00-00"
                        guide={false}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                </label>
                <button type="submit">Отправить</button>
            </form>
        </div>
    );
};

export default PhoneAuth;
