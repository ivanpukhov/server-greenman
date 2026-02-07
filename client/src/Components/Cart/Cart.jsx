import axios from 'axios';
import React, {useEffect, useState} from 'react';
import Sheet from "react-modal-sheet";
import MaskedInput from "react-text-mask";
import {useAuth} from '../../AuthContext.jsx';
import {useCart} from '../../CartContext.jsx';
import iconMinus from "../../images/bottom_bar/Icon-minus.svg";
import iconPlus from "../../images/bottom_bar/Icon-plus.svg";
import charm_tick from "../../images/charm_tick.svg";
import delivery__address from "../../images/delivery__address.png";
import delivery__name from "../../images/delivery__name.png";
import whatsappNumber from "../../images/whatsapp.png";
import kaspi__phone from "../../images/kaspi.png";
import indrive from "../../images/indrive.svg";
import kaspi from "../../images/kaspi.svg";
import kazpost from "../../images/kazpost-kaz.svg";
import mdi from "../../images/mdi_courier.svg";
import money from "../../images/money.svg";
import Banner from "../Banner/Banner.jsx";
import cityData from './cityData';
import Swal from 'sweetalert2';
import {Link, useNavigate} from "react-router-dom";
import ScrollToTop from "../ScrollToTop";
import { apiUrl } from "../../config/api";

const Cart = () => {

    const {isAuthenticated} = useAuth();
    const {cart, removeFromCart, updateQuantity, clearCart} = useCart();
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
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth');
        }
    }, [navigate]);

    const handleClick = () => {
        if (!isFormValid || isSubmitting) {
            Swal.fire({
                icon: 'error',
                title: 'Ошибка',
                text: 'Не все обязательные поля заполнены или не выбраны способы доставки и оплаты.'
            });
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

        setIsFormValid(
            isPhoneNumberValid &&
            isKaspiNumberValid &&
            isPostalCodeValid &&
            isCityValid &&
            isStreetValid &&
            isHouseNumberValid &&
            isPaymentMethodSelected &&
            isDeliveryMethodSelected
        );
    }, [phoneNumber, kaspiNumber, postalCode, inputValue, street, houseNumber, paymentMethod, deliveryMethod]);


    useEffect(() => {
        const fetchDeliveryProfiles = async () => {
            const config = {
                headers: {Authorization: `Bearer ${localStorage.token}`}
            };
            console.log(localStorage.token)
            if (isAuthenticated) {
                try {
                    const response = await axios.get(`/api/order-profiles/user/${localStorage.userId}`, config);
                    if (response.data.length > 0) {
                        setDeliveryProfiles(response.data);
                        setIsModalOpen(true);
                    }
                } catch (error) {
                    console.error('Ошибка при получении профилей доставки:', error);
                }
            }
        };

        fetchDeliveryProfiles();
    }, [isAuthenticated]);
    const formatPhoneNumberForDisplay = (phoneNumber) => {
        const match = phoneNumber.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
        if (match) {
            return `+7 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
        }
        return phoneNumber;
    };

    const formatKaspiNumberForDisplay = (kaspiNumber) => {
        const match = kaspiNumber.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
        if (match) {
            return `+7 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
        }
        return kaspiNumber;
    };


    const handleProfileSelect = (profile) => {
        setCustomerName(profile.name);
        setPostalCode(profile.addressIndex);
        setInputValue(profile.city);
        setStreet(profile.street);
        setHouseNumber(profile.houseNumber);
        setPhoneNumber(formatPhoneNumberForDisplay(profile.phoneNumber));
        setKaspiNumber(formatKaspiNumberForDisplay(profile.phoneNumber));
        setIsModalOpen(false);
    };

    if (cart.length === 0) {
        return (
            <div className="cart__n">

                <ScrollToTop/>

                <div className="cart__null">
                    <div className="cart__null-title">
                        Ваша корзина пуста
                    </div>
                    <div className="cart__null-text">
                        Выберите товар в каталоге, либо введите название товара или болезни в поиске, и выберите то, что
                        поможет именно Вам!
                    </div>
                    <Link to={'/'} className="cart__null--btn">На главную</Link>
                    <Link to={'/catalog'} className="cart__null--btn">Перейти в каталог</Link>
                </div>
            </div>
        );
    }

    const getDeclension = (number, one, few, many) => {
        number = Math.abs(number);
        number %= 100;
        if (number >= 5 && number <= 20) {
            return many;
        }
        number %= 10;
        if (number === 1) {
            return one;
        }
        if (number >= 2 && number <= 4) {
            return few;
        }
        return many;
    };

    const totalItemsInCart = cart.reduce((total, item) => total + item.quantity, 0);
    const declension = getDeclension(totalItemsInCart, 'товар', 'товара', 'товаров');
    const result = `${totalItemsInCart} ${declension}`;

    const decrementQuantity = (productId) => {
        const product = cart.find(item => item.id === productId);
        if (product.quantity > 1) {
            updateQuantity(productId, product.quantity - 1);
        }
    };

    const incrementQuantity = (productId) => {
        const product = cart.find(item => item.id === productId);
        updateQuantity(productId, product.quantity + 1);
    };

    const deleteProduct = (productId) => {
        removeFromCart(productId);
    };

    const truncateString = (str, num = 80) => {
        return str.length > num ? str.slice(0, num) + '...' : str;
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        let newSuggestions = [];

        if (value) {
            cityData.forEach(regionData => {
                Object.values(regionData).forEach(cities => {
                    cities.forEach(city => {
                        if (city.city.toLowerCase().startsWith(value.toLowerCase())) {
                            newSuggestions.push(city);
                        }
                    });
                });
            });

            setSuggestions(newSuggestions.length ? newSuggestions : [{city: "Город не найден", index: ""}]);
        } else {
            setSuggestions([]);
        }
    };

    const handleCitySelect = (city, index) => {
        setInputValue(city);
        setPostalCode(index);
        setSuggestions([]);
    };

    const handlePostalCodeChange = (e) => {
        setPostalCode(e.target.value);
    };

    const isIndriveAvailable = () => {
        const availableCities = ['Щучинск', 'Кокшетау', 'Астана', 'Костанай'];
        return availableCities.includes(inputValue);
    };

    const isCashPaymentAvailable = () => {
        return inputValue === 'Петропавловск';
    };

    const isCityDeliveryAvailable = () => {
        return inputValue === 'Петропавловск';
    };

    const isKazpostAvailable = () => {
        return inputValue !== 'Петропавловск';
    };

    const calculateDeliveryCost = () => {
      if (deliveryMethod === 'kazpost') {
          const totalVolume = cart.reduce((sum, item) => {
              const typeDescription = item.type.type;
              const volumeMatch = typeDescription.match(/\b\d+\b/);
              let volume = 1000;
              if (volumeMatch && volumeMatch[0]) {
                  volume = parseInt(volumeMatch[0], 10);
                  if (volume < 300) {
                      volume = 1000;
                  }
              }
              return sum + volume * item.quantity;
          }, 0);
  
          const basePrice = 1800;
          if (totalVolume <= 1000) {
              return basePrice;
          } else {
              const extraVolume = totalVolume - 1000;
              const extraCost = Math.ceil(extraVolume / 1000) * 400;
              return basePrice + extraCost;
          }
      } else if (deliveryMethod === 'indrive') {
          return 4000;
      } else if (deliveryMethod === 'city') {
          return 1500;
      }
  
      return 3000;
  };
  

    const totalCost = cart.reduce((total, item) => total + item.type.price * item.quantity, 0);
    const deliveryCost = calculateDeliveryCost();
    const finalTotal = totalCost + deliveryCost;

    const handleOrderSubmit = async () => {
        setIsSubmitting(true);
        const products = cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            typeId: item.type.id
        }));
        const formatPhoneNumberForServer = (phoneNumber) => {
            return phoneNumber.replace(/[^\d]/g, '').slice(1);
        };
        const formatKaspiNumberForServer = (phoneNumber) => {
            return phoneNumber.replace(/[^\d]/g, '').slice(1);
        };
        const formattedPhoneNumber = formatPhoneNumberForServer(phoneNumber);
        const formattedKaspiNumber = formatKaspiNumberForServer(kaspiNumber);

        const orderData = {
            customerName,
            addressIndex: postalCode,
            city: inputValue,
            street,
            houseNumber,
            phoneNumber: formattedPhoneNumber,
            kaspiNumber: formattedKaspiNumber,
            deliveryMethod,
            paymentMethod,
            products,
            totalPrice: finalTotal
        };

        try {
            const token = localStorage.getItem('token');
            const config = token ? {headers: {Authorization: `Bearer ${token}`}} : {};
            await axios.post(apiUrl('/orders/add'), orderData, config);
            setIsSubmitting(false);
            clearCart();
            Swal.fire({
                icon: 'success',
                title: 'Заказ успешно оформлен!',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (error) {
            console.error('Ошибка при отправке заказа:', error);
            setIsSubmitting(false);
            Swal.fire({
                icon: 'error',
                title: 'Ошибка',
                text: 'Произошла ошибка при отправке заказа.'
            });
        }
    };


    return (
        <div className="cart-page">
            <ScrollToTop/>

            <div className="cart__title">
                <h2 className="cart__h2">Корзина</h2>
                <div className="cart__q">{result}</div>
            </div>
            <div className="cart">
                <div className="cart__subtitle">Товары</div>
                {cart.map(product => (
                    <div className="cart__item" key={product.id + Math.floor(Math.random() * product.id * 9999)}>
                        <div className="cart__content">
                            <div className="cart__name">{product.name}</div>
                            <div className="cart__desc">{truncateString(product.description)}</div>
                            <div className="cart__price">{product.type.price} ₸</div>
                            <div className="cart__type">{product.type.type}</div>
                        </div>
                        <div className='product__inCart'>
                            <button onClick={() => decrementQuantity(product.id)}>
                                <img className="iconMinus" src={iconMinus} alt=""/>
                            </button>
                            <div className="product__quantity">{product.quantity}</div>
                            <button onClick={() => incrementQuantity(product.id)}>
                                <img src={iconPlus} className="iconPlus" alt=""/>
                            </button>
                            <button className="iconDelete" onClick={() => deleteProduct(product.id)}>
                                <img src={iconPlus} alt="" style={{transform: 'rotate(45deg)'}}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="delivery">
                <div className="cart__subtitle">Данные для доставки</div>
                <form action="" className="delivery__form">
                    {/* Данные заказчика */}
                    <b style={{'color': '#00AB6D'}}>Фамилия и имя</b>
                    <div className="delivery__item">
                        <label htmlFor="delivery__name">
                            <img src={delivery__name} alt=""/>
                        </label>
                        <input type="text" placeholder="Фамилия и имя" id='delivery__name' value={customerName}
                               onChange={e => setCustomerName(e.target.value)}/>
                    </div>
                    <b style={{'color': '#00AB6D'}}>Номер телефона Whatsapp</b>
                    <div className="delivery__item">
                        <label htmlFor="delivery__phone">
                            <img src={whatsappNumber} alt=""/>
                        </label>
                        <MaskedInput
                            mask={['+', '7', ' ', '(', /\d/, /\d/, /\d/, ')', ' ', /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/]}
                            placeholder="+7 (000) 000-00-00"
                            guide={false}
                            value={phoneNumber}
                            id='delivery__phone'
                            onChange={e => setPhoneNumber(e.target.value)}
                        />
                    </div>
                    <b style={{'color': 'red'}}>Номер телефона Kaspi для выставления счета</b>
                    <div className="delivery__item">
                        <label htmlFor="delivery__phone">
                            <img src={kaspi__phone} alt=""/>
                        </label>
                        <MaskedInput
                            mask={['+', '7', ' ', '(', /\d/, /\d/, /\d/, ')', ' ', /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/]}
                            placeholder="+7 (000) 000-00-00"
                            guide={false}
                            value={kaspiNumber}
                            id='delivery__phone'
                            onChange={e => setKaspiNumber(e.target.value)}
                        />
                    </div>
                    <b style={{'color': '#00AB6D'}}>Город</b>
                    <div className="delivery__item">
                        <label htmlFor="delivery__city">
                            <img src={delivery__address} alt=""/>
                        </label>
                        <input
                            type="text"
                            placeholder="Город"
                            value={inputValue}
                            onChange={handleInputChange}
                            autoComplete="off"
                        />
                        {suggestions.length > 0 && (
                            <ul className="suggestions">
                                {suggestions.map((s, index) => (
                                    <li key={index + Math.floor(Math.random() * 9)}
                                        onClick={() => handleCitySelect(s.city, s.index)}>
                                        {s.city}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <b style={{'color': '#00AB6D'}}>Улица</b>

                    <div className="delivery__item">
                        <label htmlFor="delivery__street">
                            <img src={delivery__address} alt=""/>
                        </label>
                        <input type="text" placeholder="Улица" id="delivery__street" value={street}
                               onChange={e => setStreet(e.target.value)}/>
                    </div>
                    <b style={{'color': '#00AB6D'}}>Номер дома</b>

                    <div className="delivery__item">
                        <label htmlFor="delivery__house">
                            <img src={delivery__address} alt=""/>
                        </label>
                        <input type="text" placeholder="Номер дома" id='delivery__house' className="delivery__house"
                               value={houseNumber} onChange={e => setHouseNumber(e.target.value)}/>
                    </div>
                    <b style={{'color': '#00AB6D'}}>Почтовый индекс </b>

                    <div className="delivery__item">
                        <label htmlFor="delivery__index">
                            <img src={delivery__address} alt=""/>
                        </label>
                        <input
                            type="text"
                            placeholder="Почтовый индекс"
                            value={postalCode}
                            onChange={handlePostalCodeChange}
                        />
                    </div>

                    {/* Способы доставки */}
                    <div className="cart__subtitle mt22">Способ доставки</div>
                    <div className="dway">
                        {isKazpostAvailable() && (
                            <label htmlFor="kazpost" id="kazpost-label">
                                <input type="radio" name="dway" id="kazpost" value="kazpost"
                                       onChange={() => setDeliveryMethod('kazpost')}/>
                                <div className="dway__logo">
                                    <img src={kazpost} alt=""/>
                                    <span>Казпочта</span>
                                </div>
                                <div className="dway__checkbox">
                                    <div className="dway__checkbox-item">
                                        <img src={charm_tick} alt=""/>
                                    </div>
                                </div>
                            </label>
                        )}
                        {isCityDeliveryAvailable() && (
                            <label htmlFor="city">
                                <input type="radio" name="dway" id="city" value="city"
                                       onChange={() => setDeliveryMethod('city')}/>
                                <div className="dway__logo">
                                    <img src={mdi} alt=""/>
                                    <span>Доставка</span>
                                </div>
                                <div className="dway__checkbox">
                                    <div className="dway__checkbox-item">
                                        <img src={charm_tick} alt=""/>
                                    </div>
                                </div>
                            </label>
                        )}
                        {isIndriveAvailable() && (
                            <label htmlFor="indrive">
                                <input type="radio" name="dway" id="indrive" value="indrive"
                                       onChange={() => setDeliveryMethod('indrive')}/>
                                <div className="dway__logo">
                                    <img src={indrive} alt=""/>
                                    <span>InDrive</span>
                                </div>
                                <div className="dway__checkbox">
                                    <div className="dway__checkbox-item">
                                        <img src={charm_tick} alt=""/>
                                    </div>
                                </div>
                            </label>
                        )}
                    </div>

                    {/* Способы оплаты */}
                    <div className="cart__subtitle mt22">Способ оплаты</div>
                    <div className="dway">
                        {isCashPaymentAvailable() && (
                            <label htmlFor="money" id="money-label">
                                <input type="radio" name="pway" id="money" value="money"
                                       onChange={() => setPaymentMethod('money')}/>
                                <div className="dway__logo">
                                    <img src={money} alt=""/>
                                    <span>Наличными</span>
                                </div>
                                <div className="dway__checkbox">
                                    <div className="dway__checkbox-item">
                                        <img src={charm_tick} alt=""/>
                                    </div>
                                </div>
                            </label>
                        )}

                        <label htmlFor="kaspi" id="kaspi-label">
                            <input type="radio" name="pway" id="kaspi" value="kaspi"
                                   onChange={() => setPaymentMethod('kaspi')}/>
                            <div className="dway__logo">
                                <img src={kaspi} alt=""/>
                                <span>Kaspi</span>
                            </div>
                            <div className="dway__checkbox">
                                <div className="dway__checkbox-item">
                                    <img src={charm_tick} alt=""/>
                                </div>
                            </div>
                        </label>
                    </div>

                    {/* Итоговая стоимость */}
                    <div className="total">
                        <div className="total__sub">
                            <div className="total__sub-item">Сумма заказа</div>
                            <div className="total__sub-item">{totalCost} ₸</div>
                        </div>
                        <div className="total__sub">
                            <div className="total__sub-item">Доставка</div>
                            <div className="total__sub-item">{deliveryCost} ₸</div>
                        </div>
                        <div className="total__main">
                            <div className="total__main-item">Итого</div>
                            <div className="total__main-item">{finalTotal} ₸</div>
                        </div>
                    </div>

                    <div className={`cart__btn ${isFormValid && !isSubmitting ? '' : 'disabled'}`}
                         onClick={handleClick}>
                        {isSubmitting ? 'Отправка...' : 'Оформить заказ'}
                    </div>


                </form>
            </div>

            <Banner/>

            {/* Модальное окно для выбора профиля доставки */}
            <Sheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <Sheet.Container className="sheet-container-class">
                    <Sheet.Header/>
                    <Sheet.Content>
                        <div className="delivery-profile">
                            <h2>Выберите адрес доставки</h2>
                            {deliveryProfiles.map(profile => (
                                <div
                                    key={profile.id + Math.floor(Math.random() * profile.id * 999)}
                                    className="delivery-profile--item"
                                    onClick={() => handleProfileSelect(profile)}
                                >
                                    <div>{profile.name}</div>
                                    <div>{profile.city}, {profile.street}, {profile.houseNumber}</div>
                                </div>
                            ))}
                            <div className="delivery-profile--item delivery-profile__new"
                                 onClick={() => setIsModalOpen(false)}>
                                Добавить новый адрес
                            </div>
                        </div>
                    </Sheet.Content>
                </Sheet.Container>
                <Sheet.Backdrop/>
            </Sheet>
        </div>
    );

};

export default Cart;
