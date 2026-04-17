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
    const [deliveryMode, setDeliveryMode] = useState('door');
    const [cityQuery, setCityQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState(null);
    const [citySuggestions, setCitySuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [address, setAddress] = useState('');
    const [pickupPoints, setPickupPoints] = useState([]);
    const [selectedPvzCode, setSelectedPvzCode] = useState('');
    const [pickupPointsLoading, setPickupPointsLoading] = useState(false);
    const [pickupPointsError, setPickupPointsError] = useState('');
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

    useEffect(() => {
        setSelectedPvzCode('');
        setPickupPoints([]);
        setPickupPointsError('');

        if (deliveryMode !== 'pvz' || !selectedCity?.code) {
            setPickupPointsLoading(false);
            return undefined;
        }

        let cancelled = false;
        setPickupPointsLoading(true);

        axios.get(apiUrl('/cdek/pickup-points'), {
            params: { cityCode: selectedCity.code }
        }).then((response) => {
            if (cancelled) return;
            setPickupPoints(Array.isArray(response.data) ? response.data : []);
        }).catch((error) => {
            if (cancelled) return;
            console.error('Ошибка загрузки ПВЗ:', error);
            setPickupPoints([]);
            setPickupPointsError(error.response?.data?.error || 'Не удалось загрузить список ПВЗ');
        }).finally(() => {
            if (!cancelled) setPickupPointsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [deliveryMode, selectedCity]);

    const totalKzt = useMemo(
        () => cart.reduce((sum, item) => sum + item.type.price * item.quantity, 0),
        [cart]
    );

    const { loading: deliveryLoading, error: deliveryError, result: deliveryResult } = useDeliveryCalculation({
        cityCode: selectedCity?.code || null,
        address,
        cart,
        deliveryMode
    });

    const deliveryRub = deliveryResult?.delivery_sum || 0;
    const totalRub = usePrice(totalKzt);
    const grandTotalRub = totalRub + deliveryRub;
    const selectedPvz = pickupPoints.find((point) => point.code === selectedPvzCode) || null;

    const isPhoneValid = phoneNumber.replace(/\D/g, '').length === 11;
    const isEmailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    const hasDeliveryTarget = deliveryMode === 'pvz' ? Boolean(selectedPvz) : Boolean(address.trim());
    const isFormValid = Boolean(
        customerName.trim() &&
        isEmailValid &&
        isPhoneValid &&
        selectedCity?.code &&
        hasDeliveryTarget &&
        deliveryResult &&
        !deliveryLoading &&
        !deliveryError &&
        !pickupPointsLoading &&
        !pickupPointsError
    );

    const handleCitySelect = (city) => {
        setSelectedCity(city);
        setCityQuery(city.full_name || `${city.city}${city.region ? ', ' + city.region : ''}`);
        setCitySuggestions([]);
        setShowSuggestions(false);
        setSelectedPvzCode('');
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
            cdekDeliveryMode: deliveryMode,
            cdekCityCode: selectedCity.code,
            cdekCityLabel: selectedCity.full_name || selectedCity.city,
            cdekAddress: deliveryMode === 'door' ? address : null,
            cdekPvzCode: deliveryMode === 'pvz' ? selectedPvz?.code : null,
            cdekPvzName: deliveryMode === 'pvz' ? selectedPvz?.name : null,
            cdekPvzAddress: deliveryMode === 'pvz' ? (selectedPvz?.full_address || selectedPvz?.address) : null,
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
                text: deliveryMode === 'pvz'
                    ? 'Заказ принят. Забрать его можно будет в выбранном ПВЗ СДЭК.'
                    : 'Курьер СДЭК свяжется с вами. Оплата наличными при получении.',
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

            <div className={styles.deliveryModeBlock}>
                <div className={styles.deliveryModeTitle}>Способ доставки</div>
                <div className={styles.deliveryModes}>
                    <button
                        type="button"
                        className={`${styles.deliveryModeBtn} ${deliveryMode === 'door' ? styles.deliveryModeBtnActive : ''}`}
                        onClick={() => setDeliveryMode('door')}
                    >
                        Дверь-дверь
                    </button>
                    <button
                        type="button"
                        className={`${styles.deliveryModeBtn} ${deliveryMode === 'pvz' ? styles.deliveryModeBtnActive : ''}`}
                        onClick={() => setDeliveryMode('pvz')}
                    >
                        Дверь-ПВЗ
                    </button>
                </div>
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
                        setSelectedPvzCode('');
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

            {deliveryMode === 'door' ? (
                <div className={styles.field}>
                    <label>Адрес (улица, дом, квартира)</label>
                    <input
                        type="text"
                        placeholder="ул. Тверская, д. 1, кв. 10"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </div>
            ) : (
                <div className={styles.field}>
                    <label>Пункт выдачи СДЭК</label>
                    <select
                        className={styles.select}
                        value={selectedPvzCode}
                        onChange={(e) => setSelectedPvzCode(e.target.value)}
                        disabled={!selectedCity?.code || pickupPointsLoading}
                    >
                        <option value="">{pickupPointsLoading ? 'Загрузка ПВЗ...' : 'Выберите пункт выдачи'}</option>
                        {pickupPoints.map((point) => (
                            <option key={point.code} value={point.code}>
                                {point.name} {point.address ? `— ${point.address}` : ''}
                            </option>
                        ))}
                    </select>
                    {pickupPointsError && <div className={styles.deliveryError}>{pickupPointsError}</div>}
                    {!pickupPointsLoading && selectedCity?.code && pickupPoints.length === 0 && !pickupPointsError && (
                        <div className={styles.deliveryHint}>Для выбранного города не найдено доступных ПВЗ</div>
                    )}
                    {selectedPvz && (
                        <div className={styles.pvzCard}>
                            <div><b>{selectedPvz.name}</b></div>
                            <div>{selectedPvz.full_address || selectedPvz.address}</div>
                            {selectedPvz.work_time && <div>График: {selectedPvz.work_time}</div>}
                            {selectedPvz.note && <div>{selectedPvz.note}</div>}
                        </div>
                    )}
                </div>
            )}

            <div className={styles.deliveryInfo}>
                {deliveryLoading && <span>Расчёт стоимости доставки…</span>}
                {deliveryError && <span className={styles.deliveryError}>{deliveryError}</span>}
                {deliveryResult && !deliveryLoading && !deliveryError && (
                    <span>
                        Доставка СДЭК ({deliveryMode === 'pvz' ? 'дверь-ПВЗ' : 'дверь-дверь'}): <b>{deliveryRub.toLocaleString('ru-RU')} ₽</b>
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
                {deliveryMode === 'pvz'
                    ? 'Оплата наличными при получении в выбранном ПВЗ.'
                    : 'Оплата наличными курьеру при получении.'}
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
