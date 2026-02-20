// Components/AuthRedirect/AuthRedirect.js

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasValidSiteSession } from '../../AuthContext.jsx';

const AuthRedirect = () => {
    const navigate = useNavigate();

    useEffect(() => {
        if (hasValidSiteSession()) {
            navigate('/profile');
        } else {
            navigate('/auth');
        }
    }, [navigate]);

    return null; // Компонент не рендерит ничего на экран
};

export default AuthRedirect;
