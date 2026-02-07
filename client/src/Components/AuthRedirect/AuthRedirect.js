// Components/AuthRedirect/AuthRedirect.js

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthRedirect = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/profile');
        } else {
            navigate('/auth');
        }
    }, [navigate]);

    return null; // Компонент не рендерит ничего на экран
};

export default AuthRedirect;
