import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../../../config/api';

export const useDeliveryCalculation = ({ cityCode, address, cart, deliveryMode }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const timerRef = useRef(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (!cityCode || !Array.isArray(cart) || cart.length === 0) {
            setResult(null);
            setError(null);
            setLoading(false);
            return undefined;
        }

        setLoading(true);
        setError(null);

        timerRef.current = setTimeout(async () => {
            const requestId = ++requestIdRef.current;
            const products = cart.map((item) => ({
                productTypeId: item.type.id,
                quantity: item.quantity
            }));
            try {
                const response = await axios.post(apiUrl('/cdek/calculate'), {
                    toCityCode: cityCode,
                    toAddress: address || undefined,
                    products,
                    deliveryMode
                });
                if (requestId !== requestIdRef.current) return;
                setResult(response.data);
                setError(null);
            } catch (err) {
                if (requestId !== requestIdRef.current) return;
                setResult(null);
                setError(err.response?.data?.error || 'Не удалось рассчитать доставку');
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        }, 500);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [cityCode, address, cart, deliveryMode]);

    return { loading, error, result };
};

export default useDeliveryCalculation;
