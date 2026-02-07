import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import s from './scss/Login.module.scss';
import phone from "../../images/delivery__phone.png";
import MaskedInput from 'react-text-mask';
import { useAuth } from "../../AuthContext";

const CodeConfirm = ({ phoneNumber, onPhoneNumberChange }) => {
    const [code, setCode] = useState('');
    const navigate = useNavigate();

    const { login } = useAuth(); // Используйте функцию login из контекста

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const cleanedCode = code.replace(/[^0-9]/g, ''); // Удаление тире и оставление только цифр
            const response = await axios.post('/api/auth/confirm-code', {
                phoneNumber,
                confirmationCode: cleanedCode
            });
            console.log("Сохраняем token и userId в localStorage");
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userId', String(response.data.userId));

            console.log("Состояние localStorage после сохранения:", localStorage.getItem('token'), localStorage.getItem('userId'));

// Добавьте логирование перед любым удалением или очищением данных
            window.addEventListener('storage', (event) => {
                console.log('Изменение localStorage:', event.key, event.oldValue, event.newValue);
            });

// Проверка вызова navigate
            window.location.reload();
            navigate('/profile');
            console.log("Переход на /profile");

        } catch (error) {
            console.error('Ошибка при подтверждении кода:', error);
        }
    };


    const resendCode = async () => {
        try {
            await axios.post('/api/auth/resend-confirmation-code', { phoneNumber });
        } catch (error) {
            console.error('Ошибка при повторной отправке кода:', error);
        }
    };

    return (
        <div className={s.form}>
            <form onSubmit={handleSubmit}>
                <div className={s.title__sup}>
                    Введите код отправленный на номер: +7{phoneNumber}
                </div>
                <label htmlFor="">
                    <img src={phone} alt=""/>
                    <MaskedInput
                        mask={[/\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/]}
                        className="form-control"
                        placeholder="00-00-00"
                        guide={false}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                </label>

                <button type="submit">Подтвердить</button>

                <a onClick={resendCode}>Отправить код повторно</a>
                <a onClick={onPhoneNumberChange}>Изменить номер</a>


            </form>
        </div>
    );
};

export default CodeConfirm;
