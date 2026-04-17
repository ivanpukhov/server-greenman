import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../../CartContext.jsx';
import { useFormatPrice, usePrice } from '../../../contexts/CountryContext.jsx';
import { apiUrl } from '../../../config/api';
import useDeliveryCalculation from './useDeliveryCalculation';
import styles from './CdekCheckout.module.scss';

const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    let out = '';
    if (digits.length > 0) out = '+' + digits[0];
    if (digits.length > 1) out += ' ' + digits.slice(1, 4);
    if (digits.length >= 4) out += ' ' + digits.slice(4, 7);
    if (digits.length >= 7) out += '-' + digits.slice(7, 9);
    if (digits.length >= 9) out += '-' + digits.slice(9, 11);
    return out;
};

const formatPhoneForServer = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 11) return `+${digits}`;
    if (digits.length === 10) return `+7${digits}`;
    return digits ? `+${digits}` : '';
};

const CdekCheckout = () => {
    const { cart, clearCart } = useCart();
    const formatPrice = useFormatPrice();
    const navigate = useNavigate();

    const [customerName, setCustomerName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [cityQuery, setCityQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState(null);
    const [citySuggestions, setCitySuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [address, setAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const suggestTimerRef = useRef(null);

    useEffect(() => {
        if (!cityQuery || cityQuery.length < 2) {
            setCitySuggestions([]);
            return undefined;
        }
        if (selectedCity && selectedCity.full_name === cityQuery) {
            return undefined;
        }

        if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
        suggestTimerRef.current = setTimeout(async () => {
            try {
                const response = await axios.get(apiUrl('/cdek/cities/suggest'), {
                    params: { q: cityQuery }
                });
                setCitySuggestions(Array.isArray(response.data) ? response.data : []);
            } catch (err) {
                console.error('Ошибка автокомплита города:', err);
                setCitySuggestions([]);
            }
        }, 350);

        return () => {
            if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
        };
    }, [cityQuery, selectedCity]);

    const totalKzt = useMemo(
        () => cart.reduce((sum, item) => sum + item.type.price * item.quantity, 0),
        [cart]
    );

    const { loading: deliveryLoading, error: deliveryError, result: deliveryResult } = useDeliveryCalculation({
        cityCode: selectedCity?.code || null,
        address,
        cart
    });

    const deliveryRub = deliveryResult?.delivery_sum || 0;
    const totalRub = usePrice(totalKzt);
    const grandTotalRub = totalRub + deliveryRub;

    const isPhoneValid = phoneNumber.replace(/\D/g, '').length === 11;
    const isEmailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    const isFormValid = Boolean(
        customerName.trim() &&
        isEmailValid &&
        isPhoneValid &&
        selectedCity?.code &&
        address.trim() &&
        deliveryResult &&
        !deliveryLoading &&
        !deliveryError
    );

    const handleCitySelect = (city) => {
        setSelectedCity(city);
        setCityQuery(city.full_name || `${city.city}${city.region ? ', ' + city.region : ''}`);
        setCitySuggestions([]);
        setShowSuggestions(false);
    };

    const handleSubmit = async () => {
        if (!isFormValid || isSubmitting) {
            Swal.fire({
                icon: 'error',
                title: 'Ошибка',
                text: 'Заполните все поля и дождитесь расчёта стоимости доставки.'
            });
            return;
        }
        setIsSubmitting(true);

        const products = cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            typeId: item.type.id
        }));

        const payload = {
            customerName,
            email,
            phoneNumber: formatPhoneForServer(phoneNumber),
            country: 'RF',
            deliveryMethod: 'cdek',
            paymentMethod: 'cod',
            products,
            totalPrice: grandTotalRub,
            cdekCityCode: selectedCity.code,
            cdekCityLabel: selectedCity.full_name || selectedCity.city,
            cdekAddress: address,
            cdekCalcPriceRub: deliveryRub
        };

        try {
            const token = localStorage.getItem('token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            await axios.post(apiUrl('/orders/add'), payload, config);
            clearCart();
            await Swal.fire({
                icon: 'success',
                title: 'Заказ принят!',
                text: 'Курьер СДЭК свяжется с вами. Оплата наличными при получении.',
                confirmButtonText: 'Хорошо'
            });
            navigate('/');
        } catch (error) {
            console.error('Ошибка при отправке RF-заказа:', error);
            Swal.fire({
                icon: 'error',
                title: 'Ошибка',
                text: error.response?.data?.error || 'Произошла ошибка при отправке заказа.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.checkout}>
            <div className="cart__subtitle">Данные получателя</div>

            <div className={styles.field}>
                <label>ФИО</label>
                <input
                    type="text"
                    placeholder="Фамилия Имя Отчество"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                />
            </div>

            <div className={styles.field}>
                <label>Email</label>
                <input
                    type="email"
                    placeholder="name@example.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>

            <div className={styles.field}>
                <label>Телефон</label>
                <input
                    type="tel"
                    placeholder="+7 000 000-00-00"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhone(e.target.value))}
                />
            </div>

            <div className={`${styles.field} ${styles.cityField}`}>
                <label>Город доставки</label>
                <input
                    type="text"
                    placeholder="Начните вводить название"
                    value={cityQuery}
                    onChange={(e) => {
                        setCityQuery(e.target.value);
                        setSelectedCity(null);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    autoComplete="off"
                />
                {showSuggestions && citySuggestions.length > 0 && (
                    <ul className={styles.suggestions}>
                        {citySuggestions.map((city) => (
                            <li
                                key={`${city.code}-${city.full_name}`}
                                onClick={() => handleCitySelect(city)}
                            >
                                {city.full_name || `${city.city}${city.region ? ', ' + city.region : ''}`}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className={styles.field}>
                <label>Адрес (улица, дом, квартира)</label>
                <input
                    type="text"
                    placeholder="ул. Тверская, д. 1, кв. 10"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                />
            </div>

            <div className={styles.deliveryInfo}>
                {deliveryLoading && <span>Расчёт стоимости доставки…</span>}
                {deliveryError && <span className={styles.deliveryError}>{deliveryError}</span>}
                {deliveryResult && !deliveryLoading && !deliveryError && (
                    <span>
                        Доставка СДЭК (дверь-дверь): <b>{deliveryRub.toLocaleString('ru-RU')} ₽</b>
                        {deliveryResult.period_min && deliveryResult.period_max && (
                            <>, {deliveryResult.period_min}–{deliveryResult.period_max} дн.</>
                        )}
                    </span>
                )}
                {!selectedCity && !deliveryLoading && (
                    <span className={styles.deliveryHint}>Выберите город, чтобы рассчитать стоимость доставки</span>
                )}
            </div>

            <div className={styles.paymentNotice}>
                Оплата наличными курьеру при получении.
            </div>

            <div className="total">
                <div className="total__sub">
                    <div className="total__sub-item">Сумма заказа</div>
                    <div className="total__sub-item">{formatPrice(totalKzt)}</div>
                </div>
                <div className="total__sub">
                    <div className="total__sub-item">Доставка</div>
                    <div className="total__sub-item">
                        {deliveryResult ? `${deliveryRub.toLocaleString('ru-RU')} ₽` : '—'}
                    </div>
                </div>
                <div className="total__main">
                    <div className="total__main-item">Итого</div>
                    <div className="total__main-item">
                        {grandTotalRub.toLocaleString('ru-RU')} ₽
                    </div>
                </div>
            </div>

            <div
                className={`cart__btn ${isFormValid && !isSubmitting ? '' : 'disabled'}`}
                onClick={handleSubmit}
            >
                {isSubmitting ? 'Отправка…' : 'Оформить заказ'}
            </div>
        </div>
    );
};

export default CdekCheckout;
