import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Card,
    Container,
    Divider,
    Drawer,
    Grid,
    Group,
    Radio,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    Title,
    UnstyledButton,
} from '@mantine/core';
import { hasValidSiteSession, useAuth } from '../../AuthContext.jsx';
import { useCart } from '../../CartContext.jsx';
import { useCountry, useFormatPrice } from '../../contexts/CountryContext.jsx';
import { apiUrl } from '../../config/api';
import cityData from './cityData';
import ScrollToTop from '../ScrollToTop';
import CdekCheckout from './RfCheckout/CdekCheckout.jsx';
import emptyCart from '../../images/illustrations/empty-cart.svg';
import kaspiLogo from '../../images/kaspi.svg';
import kazpostLogo from '../../images/kazpost-kaz.svg';
import indriveLogo from '../../images/indrive.svg';
import {
    IconArrowLeft,
    IconCash,
    IconMapPin,
    IconMinus,
    IconPhone,
    IconPlus,
    IconTruck,
    IconUser,
    IconX,
    IconBuildingStore,
    IconMailbox,
} from '../../icons';
import s from './Cart.module.scss';

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

const truncate = (str, n = 80) => (str && str.length > n ? str.slice(0, n) + '…' : str || '');

const CartThumb = ({ name }) => {
    const initial = (name || '?').trim().charAt(0).toUpperCase();
    return <div className={s.thumb} aria-hidden="true">{initial}</div>;
};

const DeliveryOption = ({ checked, onChange, icon, title, desc, logo }) => (
    <UnstyledButton
        onClick={onChange}
        className={`${s.option} ${checked ? s.optionChecked : ''}`}
    >
        <Group wrap="nowrap" gap="sm" align="center">
            {logo ? (
                <div className={s.optionLogo}><img src={logo} alt="" /></div>
            ) : (
                <div className={s.optionIcon}>{icon}</div>
            )}
            <Stack gap={2} style={{ flex: 1 }}>
                <Text fw={600} size="sm">{title}</Text>
                {desc && <Text size="xs" c="dimmed">{desc}</Text>}
            </Stack>
            <Radio checked={checked} onChange={() => {}} color="greenman" tabIndex={-1} aria-hidden />
        </Group>
    </UnstyledButton>
);

const Cart = () => {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const { cart, removeFromCart, updateQuantity, clearCart } = useCart();
    const { isRf } = useCountry();
    const formatPrice = useFormatPrice();
    const navigate = useNavigate();

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
    const [isFormValid, setIsFormValid] = useState(false);

    useEffect(() => {
        if (!hasValidSiteSession()) navigate('/auth');
    }, [navigate]);

    useEffect(() => {
        const ok = phoneNumber.replace(/\D/g, '').length === 11
            && kaspiNumber.replace(/\D/g, '').length === 11
            && postalCode.length === 6
            && inputValue.trim() !== ''
            && street.trim() !== ''
            && houseNumber.trim() !== ''
            && paymentMethod !== ''
            && deliveryMethod !== '';
        setIsFormValid(ok);
    }, [phoneNumber, kaspiNumber, postalCode, inputValue, street, houseNumber, paymentMethod, deliveryMethod]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const config = { headers: { Authorization: `Bearer ${localStorage.token}` } };
        axios.get(`/api/order-profiles/user/${localStorage.userId}`, config)
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
        if (!value) { setSuggestions([]); return; }
        const found = [];
        cityData.forEach((region) => {
            Object.values(region).forEach((cities) => {
                cities.forEach((c) => {
                    if (c.city.toLowerCase().startsWith(value.toLowerCase())) found.push(c);
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

    const isIndriveAvailable = () => ['Щучинск', 'Кокшетау', 'Астана', 'Костанай'].includes(inputValue);
    const isCashAvailable = () => inputValue === 'Петропавловск';
    const isCityDeliveryAvailable = () => inputValue === 'Петропавловск';
    const isKazpostAvailable = () => inputValue !== 'Петропавловск';

    const totalItemsInCart = cart.reduce((total, item) => total + item.quantity, 0);

    const calculateDeliveryCost = () => {
        if (deliveryMethod === 'kazpost') {
            const totalVolume = cart.reduce((sum, item) => {
                const match = item.type.type.match(/\b\d+\b/);
                let volume = 1000;
                if (match && parseInt(match[0], 10) >= 300) volume = parseInt(match[0], 10);
                return sum + volume * item.quantity;
            }, 0);
            return 1800 + (totalVolume > 1000 ? Math.ceil((totalVolume - 1000) / 1000) * 400 : 0);
        }
        if (deliveryMethod === 'indrive') return 4000;
        if (deliveryMethod === 'city') return 1500;
        return 0;
    };

    const totalCost = cart.reduce((total, item) => total + item.type.price * item.quantity, 0);
    const deliveryCost = calculateDeliveryCost();
    const finalTotal = totalCost + deliveryCost;

    const handleOrderSubmit = async () => {
        if (!isFormValid || isSubmitting) {
            Swal.fire({ icon: 'error', title: t('common.error'), text: t('cart.validation') });
            return;
        }
        setIsSubmitting(true);
        const products = cart.map((item) => ({ productId: item.id, quantity: item.quantity, typeId: item.type.id }));
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
            totalPrice: finalTotal,
        };
        try {
            const token = localStorage.getItem('token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            await axios.post(apiUrl('/orders/add'), orderData, config);
            setIsSubmitting(false);
            clearCart();
            Swal.fire({ icon: 'success', title: t('cart.success'), showConfirmButton: false, timer: 1500 });
            navigate('/profile');
        } catch {
            setIsSubmitting(false);
            Swal.fire({ icon: 'error', title: t('common.error'), text: t('cart.error') });
        }
    };

    if (cart.length === 0) {
        return (
            <Container size="xl" px="md" py="md" className={s.page}>
                <ScrollToTop />
                <Helmet>
                    <title>{t('cart.seo_title')}</title>
                </Helmet>
                <Stack align="center" py={80} gap="md">
                    <img src={emptyCart} alt="" style={{ width: 220, height: 'auto' }} />
                    <Title order={2} ta="center" style={{ letterSpacing: '-0.02em' }}>{t('cart.empty_title')}</Title>
                    <Text c="dimmed" ta="center" size="sm" maw={420}>{t('cart.empty_text')}</Text>
                    <Group mt="sm">
                        <Button component={Link} to="/" variant="light" color="greenman" radius="xl">{t('common.home')}</Button>
                        <Button component={Link} to="/catalog" color="greenman" radius="xl">{t('common.catalog')}</Button>
                    </Group>
                </Stack>
            </Container>
        );
    }

    return (
        <Container size="xl" px="md" py="md" className={s.page}>
            <ScrollToTop />
            <Helmet>
                <title>{t('cart.seo_title')}</title>
            </Helmet>

            <Group gap="sm" mb="md">
                <ActionIcon variant="subtle" size="lg" radius="xl" onClick={() => navigate(-1)} aria-label={t('common.back')}>
                    <IconArrowLeft size={20} stroke={1.7} />
                </ActionIcon>
                <Stack gap={0}>
                    <Title order={2} style={{ letterSpacing: '-0.02em' }}>{t('cart.title')}</Title>
                    <Text size="sm" c="dimmed">{t('common.pieces')} — {totalItemsInCart}</Text>
                </Stack>
            </Group>

            <Grid gutter="xl">
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Card radius="lg" withBorder padding="lg" className={s.section}>
                        <Title order={4} mb="md" style={{ letterSpacing: '-0.01em' }}>{t('cart.items')}</Title>
                        <Stack gap="sm">
                            {cart.map((product) => (
                                <Group key={product.id} wrap="nowrap" align="flex-start" className={s.itemRow} gap="md">
                                    <CartThumb name={product.name} />
                                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                                        <Text fw={600} size="sm" lineClamp={2}>{product.name}</Text>
                                        <Text size="xs" c="dimmed" lineClamp={2}>{truncate(product.description, 80)}</Text>
                                        <Group gap="xs" mt={4}>
                                            <Badge variant="light" color="gray" size="sm" radius="sm">{product.type.type}</Badge>
                                            <Text fw={700} size="sm" c="greenman">{formatPrice(product.type.price)}</Text>
                                        </Group>
                                    </Stack>
                                    <Stack gap="xs" align="flex-end">
                                        <Group gap={4} className={s.stepper}>
                                            <ActionIcon
                                                size="sm"
                                                variant="subtle"
                                                radius="xl"
                                                onClick={() => product.quantity > 1 && updateQuantity(product.id, product.quantity - 1)}
                                                disabled={product.quantity <= 1}
                                                aria-label="-"
                                            >
                                                <IconMinus size={14} stroke={1.8} />
                                            </ActionIcon>
                                            <Text size="sm" fw={600} w={20} ta="center">{product.quantity}</Text>
                                            <ActionIcon
                                                size="sm"
                                                variant="subtle"
                                                radius="xl"
                                                onClick={() => updateQuantity(product.id, product.quantity + 1)}
                                                aria-label="+"
                                            >
                                                <IconPlus size={14} stroke={1.8} />
                                            </ActionIcon>
                                        </Group>
                                        <ActionIcon
                                            size="sm"
                                            variant="subtle"
                                            color="red"
                                            radius="xl"
                                            onClick={() => removeFromCart(product.id)}
                                            aria-label="remove"
                                        >
                                            <IconX size={14} stroke={1.8} />
                                        </ActionIcon>
                                    </Stack>
                                </Group>
                            ))}
                        </Stack>
                    </Card>

                    {isRf ? (
                        <Card radius="lg" withBorder padding="lg" mt="md">
                            <CdekCheckout />
                        </Card>
                    ) : (
                        <Card radius="lg" withBorder padding="lg" mt="md" className={s.section}>
                            <Title order={4} mb="md" style={{ letterSpacing: '-0.01em' }}>{t('cart.delivery.title')}</Title>
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                <TextInput
                                    label={t('cart.delivery.fullname')}
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.currentTarget.value)}
                                    leftSection={<IconUser size={16} stroke={1.7} />}
                                    radius="md"
                                />
                                <TextInput
                                    label={t('cart.delivery.whatsapp')}
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(formatPhone(e.currentTarget.value))}
                                    placeholder="+7 (000) 000-00-00"
                                    leftSection={<IconPhone size={16} stroke={1.7} />}
                                    radius="md"
                                    inputMode="tel"
                                />
                                <TextInput
                                    label={t('cart.delivery.kaspi')}
                                    value={kaspiNumber}
                                    onChange={(e) => setKaspiNumber(formatPhone(e.currentTarget.value))}
                                    placeholder="+7 (000) 000-00-00"
                                    leftSection={<IconPhone size={16} stroke={1.7} />}
                                    radius="md"
                                    inputMode="tel"
                                />
                                <Box style={{ position: 'relative' }}>
                                    <TextInput
                                        label={t('cart.delivery.city')}
                                        value={inputValue}
                                        onChange={(e) => handleCityChange(e.currentTarget.value)}
                                        autoComplete="off"
                                        leftSection={<IconMapPin size={16} stroke={1.7} />}
                                        radius="md"
                                    />
                                    {suggestions.length > 0 && (
                                        <ul className={s.suggestions}>
                                            {suggestions.map((sg, i) => (
                                                <li key={i} onClick={() => handleCityPick(sg.city, sg.index)}>{sg.city}</li>
                                            ))}
                                        </ul>
                                    )}
                                </Box>
                                <TextInput
                                    label={t('cart.delivery.street')}
                                    value={street}
                                    onChange={(e) => setStreet(e.currentTarget.value)}
                                    leftSection={<IconMapPin size={16} stroke={1.7} />}
                                    radius="md"
                                />
                                <TextInput
                                    label={t('cart.delivery.house')}
                                    value={houseNumber}
                                    onChange={(e) => setHouseNumber(e.currentTarget.value)}
                                    leftSection={<IconMapPin size={16} stroke={1.7} />}
                                    radius="md"
                                />
                                <TextInput
                                    label={t('cart.delivery.postal')}
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
                                    leftSection={<IconMailbox size={16} stroke={1.7} />}
                                    radius="md"
                                    inputMode="numeric"
                                />
                            </SimpleGrid>

                            <Divider my="lg" />

                            <Title order={5} mb="sm" style={{ letterSpacing: '-0.01em' }}>{t('cart.delivery.method_title')}</Title>
                            <SimpleGrid cols={{ base: 1, sm: inputValue ? 2 : 1 }} spacing="sm">
                                {isKazpostAvailable() && (
                                    <DeliveryOption
                                        checked={deliveryMethod === 'kazpost'}
                                        onChange={() => setDeliveryMethod('kazpost')}
                                        icon={<IconTruck size={22} stroke={1.6} />}
                                        logo={kazpostLogo}
                                        title={t('cart.delivery.method_kazpost')}
                                    />
                                )}
                                {isCityDeliveryAvailable() && (
                                    <DeliveryOption
                                        checked={deliveryMethod === 'city'}
                                        onChange={() => setDeliveryMethod('city')}
                                        icon={<IconBuildingStore size={22} stroke={1.6} />}
                                        title={t('cart.delivery.method_courier')}
                                    />
                                )}
                                {isIndriveAvailable() && (
                                    <DeliveryOption
                                        checked={deliveryMethod === 'indrive'}
                                        onChange={() => setDeliveryMethod('indrive')}
                                        icon={<IconTruck size={22} stroke={1.6} />}
                                        logo={indriveLogo}
                                        title={t('cart.delivery.method_indrive')}
                                    />
                                )}
                            </SimpleGrid>

                            <Divider my="lg" />

                            <Title order={5} mb="sm" style={{ letterSpacing: '-0.01em' }}>{t('cart.payment.title')}</Title>
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
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
                            </SimpleGrid>
                        </Card>
                    )}
                </Grid.Col>

                {!isRf && (
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <Card radius="lg" withBorder padding="lg" className={s.summary}>
                            <Title order={5} mb="md" style={{ letterSpacing: '-0.01em' }}>{t('cart.summary.title')}</Title>
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">{t('cart.summary.subtotal')}</Text>
                                    <Text size="sm" fw={500}>{formatPrice(totalCost)}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">{t('cart.summary.delivery')}</Text>
                                    <Text size="sm" fw={500}>
                                        {deliveryMethod ? formatPrice(deliveryCost) : t('cart.summary.delivery_calc')}
                                    </Text>
                                </Group>
                                <Divider my="xs" />
                                <Group justify="space-between">
                                    <Text fw={700}>{t('cart.summary.total')}</Text>
                                    <Text fw={800} size="xl" c="greenman" style={{ letterSpacing: '-0.02em' }}>
                                        {formatPrice(finalTotal)}
                                    </Text>
                                </Group>
                            </Stack>

                            {!isFormValid && (
                                <Alert variant="light" color="yellow" mt="md" radius="md" p="xs">
                                    <Text size="xs">{t('cart.validation')}</Text>
                                </Alert>
                            )}

                            <Button
                                fullWidth
                                mt="md"
                                size="md"
                                radius="xl"
                                color="greenman"
                                onClick={handleOrderSubmit}
                                loading={isSubmitting}
                                disabled={!isFormValid}
                            >
                                {isSubmitting ? t('cart.actions.sending') : t('cart.actions.checkout')}
                            </Button>
                        </Card>
                    </Grid.Col>
                )}
            </Grid>

            <Drawer
                opened={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                position="bottom"
                size="auto"
                radius="lg"
                title={<Text fw={700}>{t('cart.address_drawer.title')}</Text>}
                overlayProps={{ opacity: 0.35, blur: 2 }}
            >
                <Stack gap="sm" pb="md">
                    {deliveryProfiles.map((profile) => (
                        <UnstyledButton
                            key={profile.id}
                            onClick={() => handleProfileSelect(profile)}
                            className={s.profileItem}
                        >
                            <Group gap="sm" wrap="nowrap">
                                <IconMapPin size={20} stroke={1.6} color="var(--mantine-color-greenman-7)" />
                                <Stack gap={2}>
                                    <Text fw={600} size="sm">{profile.name}</Text>
                                    <Text size="xs" c="dimmed">{profile.city}, {profile.street}, {profile.houseNumber}</Text>
                                </Stack>
                            </Group>
                        </UnstyledButton>
                    ))}
                    <UnstyledButton
                        onClick={() => setDrawerOpen(false)}
                        className={`${s.profileItem} ${s.profileItemNew}`}
                    >
                        <Group gap="sm">
                            <IconPlus size={18} stroke={1.7} />
                            <Text fw={600} size="sm">{t('cart.address_drawer.new')}</Text>
                        </Group>
                    </UnstyledButton>
                </Stack>
            </Drawer>
        </Container>
    );
};

export default Cart;
