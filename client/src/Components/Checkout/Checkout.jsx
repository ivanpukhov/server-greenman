import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Drawer,
    Radio,
    Stepper,
    TextInput,
    UnstyledButton,
} from '@mantine/core';
import { hasValidSiteSession, useAuth } from '../../AuthContext.jsx';
import { useCart } from '../../CartContext.jsx';
import { useCountry } from '../../contexts/CountryContext.jsx';
import { CURRENCIES, toDisplayPrice } from '../../config/currency';
import { apiUrl } from '../../config/api';
import cityData from '../Cart/cityData';
import ScrollToTop from '../ScrollToTop';
import CdekCheckout from '../Cart/RfCheckout/CdekCheckout.jsx';
import kaspiLogo from '../../images/kaspi.svg';
import kazpostLogo from '../../images/kazpost-kaz.svg';
import indriveLogo from '../../images/indrive.svg';
import {
    Breadcrumbs,
    Button,
    PageContainer,
    PricePill,
    toast,
} from '../../ui';
import {
    IconBuildingStore,
    IconCash,
    IconMailbox,
    IconMapPin,
    IconPhone,
    IconPlus,
    IconTruck,
    IconUser,
} from '../../icons';
import s from './Checkout.module.scss';

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

const DeliveryOption = ({ checked, onChange, icon, title, desc, logo }) => (
    <UnstyledButton
        onClick={onChange}
        className={`${s.option} ${checked ? s.optionChecked : ''}`}
    >
        <div className={s.optionInner}>
            {logo ? (
                <div className={s.optionLogo}>
                    <img src={logo} alt="" />
                </div>
            ) : (
                <div className={s.optionIcon}>{icon}</div>
            )}
            <div className={s.optionText}>
                <div className={s.optionTitle}>{title}</div>
                {desc && <div className={s.optionDesc}>{desc}</div>}
            </div>
            <Radio
                checked={checked}
                onChange={() => {}}
                color="greenman"
                tabIndex={-1}
                aria-hidden
            />
        </div>
    </UnstyledButton>
);

const Checkout = () => {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const { cart, clearCart } = useCart();
    const { country, isRf } = useCountry();
    const navigate = useNavigate();
    const currencyCode = CURRENCIES[country]?.code || 'KZT';

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
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [deliveryProfiles, setDeliveryProfiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!hasValidSiteSession()) navigate('/auth?redirect=/checkout');
    }, [navigate]);

    useEffect(() => {
        if (cart.length === 0) navigate('/cart');
    }, [cart.length, navigate]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const config = {
            headers: { Authorization: `Bearer ${localStorage.token}` },
        };
        axios
            .get(`/api/order-profiles/user/${localStorage.userId}`, config)
            .then((res) => {
                if (res.data.length > 0) {
                    setDeliveryProfiles(res.data);
                    setDrawerOpen(true);
                }
            })
            .catch(() => {});
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
        setDrawerOpen(false);
    };

    const handleCityChange = (value) => {
        setInputValue(value);
        if (!value) {
            setSuggestions([]);
            return;
        }
        const found = [];
        cityData.forEach((region) => {
            Object.values(region).forEach((cities) => {
                cities.forEach((c) => {
                    if (c.city.toLowerCase().startsWith(value.toLowerCase()))
                        found.push(c);
                });
            });
        });
        setSuggestions(found.slice(0, 8));
    };

    const handleCityPick = (city, index) => {
        setInputValue(city);
        setPostalCode(index);
        setSuggestions([]);
    };

    const isIndriveAvailable = () =>
        ['Щучинск', 'Кокшетау', 'Астана', 'Костанай'].includes(inputValue);
    const isCashAvailable = () => inputValue === 'Петропавловск';
    const isCityDeliveryAvailable = () => inputValue === 'Петропавловск';
    const isKazpostAvailable = () => inputValue !== 'Петропавловск';

    const contactValid =
        customerName.trim() !== '' &&
        phoneNumber.replace(/\D/g, '').length === 11 &&
        kaspiNumber.replace(/\D/g, '').length === 11;
    const deliveryValid =
        inputValue.trim() !== '' &&
        street.trim() !== '' &&
        houseNumber.trim() !== '' &&
        postalCode.length === 6 &&
        deliveryMethod !== '';
    const paymentValid = paymentMethod !== '';
    const isFormValid = contactValid && deliveryValid && paymentValid;

    const activeStep = useMemo(() => {
        if (!contactValid) return 0;
        if (!deliveryValid) return 1;
        if (!paymentValid) return 2;
        return 3;
    }, [contactValid, deliveryValid, paymentValid]);

    const totalItemsKzt = cart.reduce(
        (sum, item) => sum + item.type.price * item.quantity,
        0,
    );

    const calculateDeliveryCost = () => {
        if (deliveryMethod === 'kazpost') {
            const totalVolume = cart.reduce((sum, item) => {
                const match = item.type.type.match(/\b\d+\b/);
                let volume = 1000;
                if (match && parseInt(match[0], 10) >= 300)
                    volume = parseInt(match[0], 10);
                return sum + volume * item.quantity;
            }, 0);
            return (
                1800 +
                (totalVolume > 1000
                    ? Math.ceil((totalVolume - 1000) / 1000) * 400
                    : 0)
            );
        }
        if (deliveryMethod === 'indrive') return 4000;
        if (deliveryMethod === 'city') return 1500;
        return 0;
    };

    const deliveryCostKzt = calculateDeliveryCost();
    const finalKzt = totalItemsKzt + deliveryCostKzt;

    const subtotalDisplay = toDisplayPrice(totalItemsKzt, country);
    const deliveryDisplay = toDisplayPrice(deliveryCostKzt, country);
    const totalDisplay = toDisplayPrice(finalKzt, country);

    const handleOrderSubmit = async () => {
        if (!isFormValid || isSubmitting) {
            toast.error(t('cart.validation'), { title: t('common.error') });
            return;
        }
        setIsSubmitting(true);
        const products = cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            typeId: item.type.id,
        }));
        const stripToDigits = (p) => p.replace(/\D/g, '').slice(1);
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
            totalPrice: finalKzt,
        };
        try {
            const token = localStorage.getItem('token');
            const config = token
                ? { headers: { Authorization: `Bearer ${token}` } }
                : {};
            await axios.post(apiUrl('/orders/add'), orderData, config);
            setIsSubmitting(false);
            clearCart();
            toast.success(t('cart.success'));
            navigate('/profile');
        } catch {
            setIsSubmitting(false);
            toast.error(t('cart.error'), { title: t('common.error') });
        }
    };

    return (
        <PageContainer size="xl" className={s.page}>
            <ScrollToTop />
            <Helmet>
                <title>{t('cart.actions.to_checkout')} — GreenMan</title>
            </Helmet>
            <Breadcrumbs
                items={[
                    { label: t('common.home'), to: '/' },
                    { label: t('cart.title'), to: '/cart' },
                    { label: t('cart.actions.to_checkout') },
                ]}
            />

            <header className={s.header}>
                <h1 className={s.title}>{t('cart.actions.to_checkout')}</h1>
            </header>

            {!isRf && (
                <Stepper
                    active={activeStep}
                    color="greenman"
                    size="sm"
                    iconSize={28}
                    className={s.stepper}
                    allowNextStepsSelect={false}
                >
                    <Stepper.Step label={t('cart.delivery.fullname')} />
                    <Stepper.Step label={t('cart.delivery.method_title')} />
                    <Stepper.Step label={t('cart.payment.title')} />
                    <Stepper.Step label={t('cart.summary.title')} />
                </Stepper>
            )}

            <div className={s.layout}>
                <section className={s.main}>
                    {isRf ? (
                        <div className={s.sectionCard}>
                            <CdekCheckout />
                        </div>
                    ) : (
                        <>
                            <div className={s.sectionCard}>
                                <h2 className={s.sectionTitle}>
                                    {t('cart.delivery.title')}
                                </h2>
                                <div className={s.fieldGrid}>
                                    <TextInput
                                        label={t('cart.delivery.fullname')}
                                        value={customerName}
                                        onChange={(e) =>
                                            setCustomerName(e.currentTarget.value)
                                        }
                                        leftSection={
                                            <IconUser size={16} stroke={1.7} />
                                        }
                                        radius="md"
                                    />
                                    <TextInput
                                        label={t('cart.delivery.whatsapp')}
                                        value={phoneNumber}
                                        onChange={(e) =>
                                            setPhoneNumber(
                                                formatPhone(e.currentTarget.value),
                                            )
                                        }
                                        placeholder="+7 (000) 000-00-00"
                                        leftSection={
                                            <IconPhone size={16} stroke={1.7} />
                                        }
                                        radius="md"
                                        inputMode="tel"
                                    />
                                    <TextInput
                                        label={t('cart.delivery.kaspi')}
                                        value={kaspiNumber}
                                        onChange={(e) =>
                                            setKaspiNumber(
                                                formatPhone(e.currentTarget.value),
                                            )
                                        }
                                        placeholder="+7 (000) 000-00-00"
                                        leftSection={
                                            <IconPhone size={16} stroke={1.7} />
                                        }
                                        radius="md"
                                        inputMode="tel"
                                    />
                                    <div className={s.cityWrap}>
                                        <TextInput
                                            label={t('cart.delivery.city')}
                                            value={inputValue}
                                            onChange={(e) =>
                                                handleCityChange(e.currentTarget.value)
                                            }
                                            autoComplete="off"
                                            leftSection={
                                                <IconMapPin size={16} stroke={1.7} />
                                            }
                                            radius="md"
                                        />
                                        {suggestions.length > 0 && (
                                            <ul className={s.suggestions}>
                                                {suggestions.map((sg, i) => (
                                                    <li
                                                        key={i}
                                                        onClick={() =>
                                                            handleCityPick(
                                                                sg.city,
                                                                sg.index,
                                                            )
                                                        }
                                                    >
                                                        {sg.city}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <TextInput
                                        label={t('cart.delivery.street')}
                                        value={street}
                                        onChange={(e) =>
                                            setStreet(e.currentTarget.value)
                                        }
                                        leftSection={
                                            <IconMapPin size={16} stroke={1.7} />
                                        }
                                        radius="md"
                                    />
                                    <TextInput
                                        label={t('cart.delivery.house')}
                                        value={houseNumber}
                                        onChange={(e) =>
                                            setHouseNumber(e.currentTarget.value)
                                        }
                                        leftSection={
                                            <IconMapPin size={16} stroke={1.7} />
                                        }
                                        radius="md"
                                    />
                                    <TextInput
                                        label={t('cart.delivery.postal')}
                                        value={postalCode}
                                        onChange={(e) =>
                                            setPostalCode(
                                                e.currentTarget.value
                                                    .replace(/\D/g, '')
                                                    .slice(0, 6),
                                            )
                                        }
                                        leftSection={
                                            <IconMailbox size={16} stroke={1.7} />
                                        }
                                        radius="md"
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>

                            <div className={s.sectionCard}>
                                <h2 className={s.sectionTitle}>
                                    {t('cart.delivery.method_title')}
                                </h2>
                                <div className={s.optionGrid}>
                                    {isKazpostAvailable() && (
                                        <DeliveryOption
                                            checked={deliveryMethod === 'kazpost'}
                                            onChange={() =>
                                                setDeliveryMethod('kazpost')
                                            }
                                            icon={<IconTruck size={22} stroke={1.6} />}
                                            logo={kazpostLogo}
                                            title={t('cart.delivery.method_kazpost')}
                                        />
                                    )}
                                    {isCityDeliveryAvailable() && (
                                        <DeliveryOption
                                            checked={deliveryMethod === 'city'}
                                            onChange={() => setDeliveryMethod('city')}
                                            icon={
                                                <IconBuildingStore
                                                    size={22}
                                                    stroke={1.6}
                                                />
                                            }
                                            title={t('cart.delivery.method_courier')}
                                        />
                                    )}
                                    {isIndriveAvailable() && (
                                        <DeliveryOption
                                            checked={deliveryMethod === 'indrive'}
                                            onChange={() =>
                                                setDeliveryMethod('indrive')
                                            }
                                            icon={<IconTruck size={22} stroke={1.6} />}
                                            logo={indriveLogo}
                                            title={t('cart.delivery.method_indrive')}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className={s.sectionCard}>
                                <h2 className={s.sectionTitle}>
                                    {t('cart.payment.title')}
                                </h2>
                                <div className={s.optionGrid}>
                                    <DeliveryOption
                                        checked={paymentMethod === 'kaspi'}
                                        onChange={() => setPaymentMethod('kaspi')}
                                        icon={null}
                                        logo={kaspiLogo}
                                        title={t('cart.payment.kaspi')}
                                    />
                                    {isCashAvailable() && (
                                        <DeliveryOption
                                            checked={paymentMethod === 'money'}
                                            onChange={() => setPaymentMethod('money')}
                                            icon={<IconCash size={22} stroke={1.6} />}
                                            title={t('cart.payment.cash')}
                                        />
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </section>

                {!isRf && (
                    <aside className={s.summary}>
                        <div className={s.summaryCard}>
                            <h2 className={s.summaryTitle}>
                                {t('cart.summary.title')}
                            </h2>
                            <div className={s.summaryRow}>
                                <span>{t('cart.summary.subtotal')}</span>
                                <PricePill
                                    value={subtotalDisplay}
                                    currency={currencyCode}
                                    size="sm"
                                />
                            </div>
                            <div className={s.summaryRow}>
                                <span>{t('cart.summary.delivery')}</span>
                                {deliveryMethod ? (
                                    <PricePill
                                        value={deliveryDisplay}
                                        currency={currencyCode}
                                        size="sm"
                                    />
                                ) : (
                                    <span className={s.summaryMuted}>
                                        {t('cart.summary.delivery_calc')}
                                    </span>
                                )}
                            </div>
                            <div className={s.summaryTotal}>
                                <span>{t('cart.summary.total')}</span>
                                <PricePill
                                    value={totalDisplay}
                                    currency={currencyCode}
                                    size="lg"
                                />
                            </div>

                            {!isFormValid && (
                                <Alert
                                    variant="light"
                                    color="yellow"
                                    radius="md"
                                    p="xs"
                                >
                                    <span className={s.alertText}>
                                        {t('cart.validation')}
                                    </span>
                                </Alert>
                            )}

                            <Button
                                onClick={handleOrderSubmit}
                                size="lg"
                                radius="xl"
                                color="greenman"
                                fullWidth
                                loading={isSubmitting}
                                disabled={!isFormValid}
                            >
                                {isSubmitting
                                    ? t('cart.actions.sending')
                                    : t('cart.actions.checkout')}
                            </Button>
                            <Button
                                component={Link}
                                to="/cart"
                                variant="subtle"
                                color="greenman"
                                size="sm"
                                fullWidth
                            >
                                {t('common.back')}
                            </Button>
                        </div>
                    </aside>
                )}
            </div>

            <Drawer
                opened={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                position="bottom"
                size="auto"
                radius="lg"
                title={<strong>{t('cart.address_drawer.title')}</strong>}
                overlayProps={{ opacity: 0.35, blur: 2 }}
            >
                <div className={s.profileList}>
                    {deliveryProfiles.map((profile) => (
                        <UnstyledButton
                            key={profile.id}
                            onClick={() => handleProfileSelect(profile)}
                            className={s.profileItem}
                        >
                            <IconMapPin size={20} stroke={1.6} />
                            <div>
                                <div className={s.profileName}>{profile.name}</div>
                                <div className={s.profileAddr}>
                                    {profile.city}, {profile.street},{' '}
                                    {profile.houseNumber}
                                </div>
                            </div>
                        </UnstyledButton>
                    ))}
                    <UnstyledButton
                        onClick={() => setDrawerOpen(false)}
                        className={`${s.profileItem} ${s.profileItemNew}`}
                    >
                        <IconPlus size={18} stroke={1.7} />
                        <span className={s.profileName}>
                            {t('cart.address_drawer.new')}
                        </span>
                    </UnstyledButton>
                </div>
            </Drawer>
        </PageContainer>
    );
};

export default Checkout;
