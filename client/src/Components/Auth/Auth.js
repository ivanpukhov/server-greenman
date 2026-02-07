// Components/Auth/Auth.js

import React, {useEffect, useState} from 'react';
import PhoneAuth from './PhoneAuth';
import CodeConfirm from './CodeConfirm';
import s from './scss/Login.module.scss'
import {Helmet} from "react-helmet";
import {useNavigate} from "react-router-dom";

const Auth = () => {
    const [step, setStep] = useState(1); // 1 для PhoneAuth, 2 для CodeConfirm
    const [phoneNumber, setPhoneNumber] = useState('');
    const navigate = useNavigate();
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/profile');
        }
    }, [navigate]);
    const handleCodeSent = (phone) => {
        setPhoneNumber(phone);
        setStep(2);
    };

    const handlePhoneNumberChange = () => {
        setStep(1);
    };

    return (
        <div className={s.back}>
            <Helmet>
                <title>Войдите в личный кабинет Greenman для доступа к натуральным лекарственным настойкам и сокам</title>
                <meta name="description" content="Войдите в свой личный кабинет Greenman, чтобы получить доступ к эксклюзивному ассортименту натуральных лекарственных настоек, соков и сиропов. Откройте для себя силу природы для поддержания и улучшения вашего здоровья и благополучия." />
                <meta name="keywords" content="личный кабинет Greenman, натуральные настойки, лекарственные соки, здоровье, натуральные сиропы, Greenman логин, здоровое питание, аптека природы, улучшение здоровья, натуральные продукты, эко продукция для здоровья" />
            </Helmet>
            <div className={s.header}>
                <h1 className={s.title}>
                    GreenMan
                </h1>
                <h2 className={s.sub}>
                    Лечебные травы
                </h2>
            </div>

            {step === 1 && <PhoneAuth onCodeSent={handleCodeSent} phoneNumber={phoneNumber} />}
            {step === 2 && <CodeConfirm phoneNumber={phoneNumber} onPhoneNumberChange={handlePhoneNumberChange} />}
        </div>
    );
};

export default Auth;
