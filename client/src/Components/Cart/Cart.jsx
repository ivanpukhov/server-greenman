import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { hasValidSiteSession, useAuth } from '../../AuthContext.jsx';
import { useCart } from '../../CartContext.jsx';
import iconMinus from '../../images/bottom_bar/Icon-minus.svg';
import iconPlus from '../../images/bottom_bar/Icon-plus.svg';
import charm_tick from '../../images/charm_tick.svg';
import delivery__address from '../../images/delivery__address.png';
import delivery__name from '../../images/delivery__name.png';
import whatsappNumber from '../../images/whatsapp.png';
import kaspi__phone from '../../images/kaspi.png';
import indrive from '../../images/indrive.svg';
import kaspi from '../../images/kaspi.svg';
import kazpost from '../../images/kazpost-kaz.svg';
import mdi from '../../images/mdi_courier.svg';
import money from '../../images/money.svg';
import Banner from '../Banner/Banner.jsx';
import cityData from './cityData';
import Swal from 'sweetalert2';
import { Link, useNavigate } from 'react-router-dom';
import ScrollToTop from '../ScrollToTop';
import { apiUrl } from '../../config/api';
import { useCountry, useFormatPrice } from '../../contexts/CountryContext.jsx';
import CdekCheckout from './RfCheckout/CdekCheckout.jsx';
import { Button, Drawer, Stack, Text, Title } from '@mantine/core';

const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    let out = '';
    if (digits.length > 0) out = '+' + digits[0];
    if (digits.length > 1) out += ' (' + digits.slice(1, 4);
    if (digits.length >= 4) out += ') ' + digits.slice(4, 7);
    if (digits.length >= 7) out += '-' + digits.slice(7, 9);
    if (digits.length >= 9) out += '-' + digits.slice(9, 11);
    return out;
};

const Cart = () => {
    const { isAuthenticated } = useAuth();
    const { cart, removeFromCart, updateQuantity, clearCart } = useCart();
    const { isRf } = useCountry();
    const formatPrice = useFormatPrice();
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [postalCode, setPostalCode] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [kaspiNumber, setKaspiNumber] = useState('');
    const [street, setStreet] = useState('');
    const [houseNumber, setHouseNumber] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deliveryProfiles, setDeliveryProfiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const [isFormValid, setIsFormValid] = useState(false);

    useEffect(() => {
        if (!hasValidSiteSession()) navigate('/auth');
    }, [navigate]);

    const handleClick = () => {
        if (!isFormValid || isSubmitting) {
            Swal.fire({ icon: 'error', title: 'Ошибка', text: 'Не все обязательные поля заполнены или не выбраны способы доставки и оплаты.' });
        } else {
            handleOrderSubmit();
        }
    };

    useEffect(() => {
        const isPhoneNumberValid = phoneNumber.replace(/[^\d]/g, '').length === 11;
        const isKaspiNumberValid = kaspiNumber.replace(/[^\d]/g, '').length === 11;
        const isPostalCodeValid = postalCode.length === 6;
        const isCityValid = inputValue.trim() !== '';
        const isStreetValid = street.trim() !== '';
        const isHouseNumberValid = houseNumber.trim() !== '';
        const isPaymentMethodSelected = paymentMethod !== '';
        const isDeliveryMethodSelected = deliveryMethod !== '';
        setIsFormValid(isPhoneNumberValid && isKaspiNumberValid && isPostalCodeValid && isCityValid && isStreetValid && isHouseNumberValid && isPaymentMethodSelected && isDeliveryMethodSelected);
    }, [phoneNumber, kaspiNumber, postalCode, inputValue, street, houseNumber, paymentMethod, deliveryMethod]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const config = { headers: { Authorization: `Bearer ${localStorage.token}` } };
        axios.get(`/api/order-profiles/user/${localStorage.userId}`, config)
            .then(response => {
                if (response.data.length > 0) {
                    setDeliveryProfiles(response.data);
                    setIsModalOpen(true);
                }
            })
            .catch(err => console.error('Ошибка при получении профилей доставки:', err));
    }, [isAuthenticated]);

    const displayPhone = (p) => {
        const m = p.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
        return m ? `+7 (${m[1]}) ${m[2]}-${m[3]}-${m[4]}` : p;
    };

    const handleProfileSelect = (profile) => {
        setCustomerName(profile.name);
        setPostalCode(profile.addressIndex);
        setInputValue(profile.city);
        setStreet(profile.street);
        setHouseNumber(profile.houseNumber);
        setPhoneNumber(displayPhone(profile.phoneNumber));
        setKaspiNumber(displayPhone(profile.phoneNumber));
        setIsModalOpen(false);
    };

    if (cart.length === 0) {
        return (
            <div className="cart__n">
                <ScrollToTop />
                <div className="cart__null">
                    <div className="cart__null-title">Ваша корзина пуста</div>
                    <div className="cart__null-text">Выберите товар в каталоге, либо введите название товара или болезни в поиске, и выберите то, что поможет именно Вам!</div>
                    <Link to="/" className="cart__null--btn">На главную</Link>
                    <Link to="/catalog" className="cart__null--btn">Перейти в каталог</Link>
                </div>
            </div>
        );
    }

    const getDeclension = (n, one, few, many) => {
        n = Math.abs(n) % 100;
        if (n >= 5 && n <= 20) return many;
        n %= 10;
        if (n === 1) return one;
        if (n >= 2 && n <= 4) return few;
        return many;
    };

    const totalItemsInCart = cart.reduce((total, item) => total + item.quantity, 0);
    const result = `${totalItemsInCart} ${getDeclension(totalItemsInCart, 'товар', 'товара', 'товаров')}`;

    const decrementQuantity = (id) => {
        const p = cart.find(i => i.id === id);
        if (p.quantity > 1) updateQuantity(id, p.quantity - 1);
    };
    const incrementQuantity = (id) => {
        const p = cart.find(i => i.id === id);
        updateQuantity(id, p.quantity + 1);
    };
    const deleteProduct = (id) => removeFromCart(id);

    const truncateString = (str, num = 80) => str.length > num ? str.slice(0, num) + '...' : str;

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        let newSuggestions = [];
        if (value) {
            cityData.forEach(regionData => {
                Object.values(regionData).forEach(cities => {
                    cities.forEach(city => {
                        if (city.city.toLowerCase().startsWith(value.toLowerCase())) newSuggestions.push(city);
                    });
                });
            });
            setSuggestions(newSuggestions.length ? newSuggestions : [{ city: 'Город не найден', index: '' }]);
        } else {
            setSuggestions([]);
        }
    };

    const handleCitySelect = (city, index) => { setInputValue(city); setPostalCode(index); setSuggestions([]); };

    const isIndriveAvailable = () => ['Щучинск', 'Кокшетау', 'Астана', 'Костанай'].includes(inputValue);
    const isCashPaymentAvailable = () => inputValue === 'Петропавловск';
    const isCityDeliveryAvailable = () => inputValue === 'Петропавловск';
    const isKazpostAvailable = () => inputValue !== 'Петропавловск';

    const calculateDeliveryCost = () => {
        if (deliveryMethod === 'kazpost') {
            const totalVolume = cart.reduce((sum, item) => {
                const volumeMatch = item.type.type.match(/\b\d+\b/);
                let volume = 1000;
                if (volumeMatch && parseInt(volumeMatch[0], 10) >= 300) volume = parseInt(volumeMatch[0], 10);
                return sum + volume * item.quantity;
            }, 0);
            return 1800 + (totalVolume > 1000 ? Math.ceil((totalVolume - 1000) / 1000) * 400 : 0);
        }
        if (deliveryMethod === 'indrive') return 4000;
        if (deliveryMethod === 'city') return 1500;
        return 3000;
    };

    const totalCost = cart.reduce((total, item) => total + item.type.price * item.quantity, 0);
    const deliveryCost = calculateDeliveryCost();
    const finalTotal = totalCost + deliveryCost;

    const handleOrderSubmit = async () => {
        setIsSubmitting(true);
        const products = cart.map(item => ({ productId: item.id, quantity: item.quantity, typeId: item.type.id }));
        const stripToDigits = (p) => p.replace(/[^\d]/g, '').slice(1);
        const orderData = {
            customerName,
            addressIndex: postalCode,
            city: inputValue,
            street,
            houseNumber,
            phoneNumber: stripToDigits(phoneNumber),
            kaspiNumber: stripToDigits(kaspiNumber),
            deliveryMethod,
            paymentMethod,
            products,
            totalPrice: finalTotal
        };
        try {
            const token = localStorage.getItem('token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            await axios.post(apiUrl('/orders/add'), orderData, config);
            setIsSubmitting(false);
            clearCart();
            Swal.fire({ icon: 'success', title: 'Заказ успешно оформлен!', showConfirmButton: false, timer: 1500 });
        } catch {
            setIsSubmitting(false);
            Swal.fire({ icon: 'error', title: 'Ошибка', text: 'Произошла ошибка при отправке заказа.' });
        }
    };

    return (
        <div className="cart-page">
            <ScrollToTop />
            <div className="cart__title">
                <h2 className="cart__h2">Корзина</h2>
                <div className="cart__q">{result}</div>
            </div>
            <div className="cart">
                <div className="cart__subtitle">Товары</div>
                {cart.map(product => (
                    <div className="cart__item" key={product.id}>
                        <div className="cart__content">
                            <div className="cart__name">{product.name}</div>
                            <div className="cart__desc">{truncateString(product.description)}</div>
                            <div className="cart__price">{formatPrice(product.type.price)}</div>
                            <div className="cart__type">{product.type.type}</div>
                        </div>
                        <div className="product__inCart">
                            <button onClick={() => decrementQuantity(product.id)}><img className="iconMinus" src={iconMinus} alt="" /></button>
                            <div className="product__quantity">{product.quantity}</div>
                            <button onClick={() => incrementQuantity(product.id)}><img src={iconPlus} className="iconPlus" alt="" /></button>
                            <button className="iconDelete" onClick={() => deleteProduct(product.id)}><img src={iconPlus} alt="" style={{ transform: 'rotate(45deg)' }} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {isRf ? (
                <div className="delivery"><CdekCheckout /></div>
            ) : (
                <div className="delivery">
                    <div className="cart__subtitle">Данные для доставки</div>
                    <form className="delivery__form">
                        <b style={{ color: '#00AB6D' }}>Фамилия и имя</b>
                        <div className="delivery__item">
                            <label><img src={delivery__name} alt="" /></label>
                            <input type="text" placeholder="Фамилия и имя" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                        </div>

                        <b style={{ color: '#00AB6D' }}>Номер телефона Whatsapp</b>
                        <div className="delivery__item">
                            <label><img src={whatsappNumber} alt="" /></label>
                            <input type="tel" placeholder="+7 (000) 000-00-00" value={phoneNumber} onChange={e => setPhoneNumber(formatPhone(e.target.value))} />
                        </div>

                        <b style={{ color: 'red' }}>Номер телефона Kaspi для выставления счета</b>
                        <div className="delivery__item">
                            <label><img src={kaspi__phone} alt="" /></label>
                            <input type="tel" placeholder="+7 (000) 000-00-00" value={kaspiNumber} onChange={e => setKaspiNumber(formatPhone(e.target.value))} />
                        </div>

                        <b style={{ color: '#00AB6D' }}>Город</b>
                        <div className="delivery__item">
                            <label><img src={delivery__address} alt="" /></label>
                            <input type="text" placeholder="Город" value={inputValue} onChange={handleInputChange} autoComplete="off" />
                            {suggestions.length > 0 && (
                                <ul className="suggestions">
                                    {suggestions.map((s, i) => (
                                        <li key={i} onClick={() => handleCitySelect(s.city, s.index)}>{s.city}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <b style={{ color: '#00AB6D' }}>Улица</b>
                        <div className="delivery__item">
                            <label><img src={delivery__address} alt="" /></label>
                            <input type="text" placeholder="Улица" value={street} onChange={e => setStreet(e.target.value)} />
                        </div>

                        <b style={{ color: '#00AB6D' }}>Номер дома</b>
                        <div className="delivery__item">
                            <label><img src={delivery__address} alt="" /></label>
                            <input type="text" placeholder="Номер дома" className="delivery__house" value={houseNumber} onChange={e => setHouseNumber(e.target.value)} />
                        </div>

                        <b style={{ color: '#00AB6D' }}>Почтовый индекс</b>
                        <div className="delivery__item">
                            <label><img src={delivery__address} alt="" /></label>
                            <input type="text" placeholder="Почтовый индекс" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
                        </div>

                        <div className="cart__subtitle mt22">Способ доставки</div>
                        <div className="dway">
                            {isKazpostAvailable() && (
                                <label htmlFor="kazpost">
                                    <input type="radio" name="dway" id="kazpost" value="kazpost" onChange={() => setDeliveryMethod('kazpost')} />
                                    <div className="dway__logo"><img src={kazpost} alt="" /><span>Казпочта</span></div>
                                    <div className="dway__checkbox"><div className="dway__checkbox-item"><img src={charm_tick} alt="" /></div></div>
                                </label>
                            )}
                            {isCityDeliveryAvailable() && (
                                <label htmlFor="city">
                                    <input type="radio" name="dway" id="city" value="city" onChange={() => setDeliveryMethod('city')} />
                                    <div className="dway__logo"><img src={mdi} alt="" /><span>Доставка</span></div>
                                    <div className="dway__checkbox"><div className="dway__checkbox-item"><img src={charm_tick} alt="" /></div></div>
                                </label>
                            )}
                            {isIndriveAvailable() && (
                                <label htmlFor="indrive">
                                    <input type="radio" name="dway" id="indrive" value="indrive" onChange={() => setDeliveryMethod('indrive')} />
                                    <div className="dway__logo"><img src={indrive} alt="" /><span>InDrive</span></div>
                                    <div className="dway__checkbox"><div className="dway__checkbox-item"><img src={charm_tick} alt="" /></div></div>
                                </label>
                            )}
                        </div>

                        <div className="cart__subtitle mt22">Способ оплаты</div>
                        <div className="dway">
                            {isCashPaymentAvailable() && (
                                <label htmlFor="money">
                                    <input type="radio" name="pway" id="money" value="money" onChange={() => setPaymentMethod('money')} />
                                    <div className="dway__logo"><img src={money} alt="" /><span>Наличными</span></div>
                                    <div className="dway__checkbox"><div className="dway__checkbox-item"><img src={charm_tick} alt="" /></div></div>
                                </label>
                            )}
                            <label htmlFor="kaspi">
                                <input type="radio" name="pway" id="kaspi" value="kaspi" onChange={() => setPaymentMethod('kaspi')} />
                                <div className="dway__logo"><img src={kaspi} alt="" /><span>Kaspi</span></div>
                                <div className="dway__checkbox"><div className="dway__checkbox-item"><img src={charm_tick} alt="" /></div></div>
                            </label>
                        </div>

                        <div className="total">
                            <div className="total__sub">
                                <div className="total__sub-item">Сумма заказа</div>
                                <div className="total__sub-item">{formatPrice(totalCost)}</div>
                            </div>
                            <div className="total__sub">
                                <div className="total__sub-item">Доставка</div>
                                <div className="total__sub-item">{formatPrice(deliveryCost)}</div>
                            </div>
                            <div className="total__main">
                                <div className="total__main-item">Итого</div>
                                <div className="total__main-item">{formatPrice(finalTotal)}</div>
                            </div>
                        </div>

                        <div className={`cart__btn ${isFormValid && !isSubmitting ? '' : 'disabled'}`} onClick={handleClick}>
                            {isSubmitting ? 'Отправка...' : 'Оформить заказ'}
                        </div>
                    </form>
                </div>
            )}

            <Banner />

            <Drawer
                opened={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                position="bottom"
                size="auto"
                radius="lg"
                title={<Text fw={700}>Выберите адрес доставки</Text>}
                overlayProps={{ opacity: 0.35, blur: 2 }}
            >
                <Stack gap="sm" pb="md">
                    {deliveryProfiles.map(profile => (
                        <div key={profile.id} className="delivery-profile--item" onClick={() => handleProfileSelect(profile)}>
                            <div>{profile.name}</div>
                            <div>{profile.city}, {profile.street}, {profile.houseNumber}</div>
                        </div>
                    ))}
                    <div className="delivery-profile--item delivery-profile__new" onClick={() => setIsModalOpen(false)}>
                        Добавить новый адрес
                    </div>
                </Stack>
            </Drawer>
        </div>
    );
};

export default Cart;
