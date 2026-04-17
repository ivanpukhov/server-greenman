import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ActionIcon, Button, Drawer, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../CartContext.jsx';
import { useFormatPrice } from '../../contexts/CountryContext.jsx';
import { IconPlus, IconMinus, IconShoppingBag, IconAlertCircle } from '../../icons';
import s from './AddToCartControl.module.scss';

const AddToCartControl = ({ product, compact = false }) => {
    const { t } = useTranslation();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const formatPrice = useFormatPrice();
    const [open, setOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const location = useLocation();

    const inCart = cart.find((item) => item.id === product.id);
    const isProductPage = /\/product\/.*/.test(location.pathname);
    const hasMultipleTypes = (product.types?.length || 0) > 1;

    const handleAdd = () => {
        addToCart({ ...product, type: product.types[selectedIndex], quantity: 1 });
        setOpen(false);
    };

    const quickAdd = () => {
        if (hasMultipleTypes) {
            setOpen(true);
        } else {
            addToCart({ ...product, type: product.types[0], quantity: 1 });
        }
    };

    const increment = () => updateQuantity(product.id, inCart.quantity + 1);
    const decrement = () => {
        if (inCart.quantity > 1) updateQuantity(product.id, inCart.quantity - 1);
        else removeFromCart(product.id);
    };

    return (
        <>
            {inCart ? (
                <div className={s.stepper}>
                    <ActionIcon onClick={decrement} size="md" radius="xl" variant="light" color="greenman" aria-label="-">
                        <IconMinus size={16} stroke={2} />
                    </ActionIcon>
                    <span className={s.count}>{inCart.quantity}</span>
                    <ActionIcon onClick={increment} size="md" radius="xl" variant="light" color="greenman" aria-label="+">
                        <IconPlus size={16} stroke={2} />
                    </ActionIcon>
                </div>
            ) : compact ? (
                <ActionIcon
                    size="lg"
                    radius="xl"
                    variant="filled"
                    color="greenman"
                    onClick={quickAdd}
                    aria-label={t('product.add_to_cart')}
                >
                    <IconPlus size={18} stroke={2} />
                </ActionIcon>
            ) : (
                <Button
                    onClick={quickAdd}
                    color="greenman"
                    leftSection={<IconShoppingBag size={18} stroke={1.8} />}
                    size="md"
                    radius="xl"
                >
                    {t('product.add_to_cart')}
                </Button>
            )}

            {isProductPage && inCart && (
                <Button
                    component={Link}
                    to="/cart"
                    color="greenman"
                    variant="light"
                    radius="xl"
                    size="sm"
                    mt="xs"
                    fullWidth
                >
                    {t('cart.actions.to_checkout')}
                </Button>
            )}

            <Drawer
                opened={open}
                onClose={() => setOpen(false)}
                position="bottom"
                size="auto"
                radius="xl"
                padding="lg"
                title={<Title order={4}>{product.name}</Title>}
            >
                <Stack gap="md" pb="md">
                    <SegmentedControl
                        fullWidth
                        radius="xl"
                        color="greenman"
                        data={product.types.map((type, index) => ({
                            label: type.type,
                            value: String(index),
                        }))}
                        value={String(selectedIndex)}
                        onChange={(val) => setSelectedIndex(Number(val))}
                    />

                    <Group justify="space-between" align="center">
                        <Text fw={800} size="xl" c="greenman">
                            {formatPrice(product.types[selectedIndex].price)}
                        </Text>
                        <Button color="greenman" onClick={handleAdd} radius="xl" leftSection={<IconShoppingBag size={18} stroke={1.8} />}>
                            {t('product.add_to_cart')}
                        </Button>
                    </Group>

                    {product.contraindications && (
                        <Group gap="xs" align="flex-start" wrap="nowrap" className={s.warn}>
                            <IconAlertCircle size={18} stroke={1.8} color="var(--mantine-color-red-6)" />
                            <div>
                                <Text size="sm" fw={600} mb={2}>{t('product.contraindications')}</Text>
                                <Text size="sm" c="dimmed">{product.contraindications}</Text>
                            </div>
                        </Group>
                    )}
                </Stack>
            </Drawer>
        </>
    );
};

export default AddToCartControl;
