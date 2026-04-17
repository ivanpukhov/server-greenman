import React, { useState } from 'react';
import { useCart } from '../../CartContext.jsx';
import { ActionIcon, Button, Drawer, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { Link, useLocation } from 'react-router-dom';
import { useFormatPrice } from '../../contexts/CountryContext.jsx';
import cardAdd from '../../images/card__add.svg';
import iconMinus from '../../images/bottom_bar/Icon-minus.svg';
import iconPlus from '../../images/bottom_bar/Icon-plus.svg';

const AddToCartControl = ({ product }) => {
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const formatPrice = useFormatPrice();
    const [open, setOpen] = useState(false);
    const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
    const location = useLocation();

    const inCart = cart.find(item => item.id === product.id);
    const isProductPage = /\/product\/.*/.test(location.pathname);

    const handleAddToCart = () => {
        addToCart({ ...product, type: product.types[selectedTypeIndex], quantity: 1 });
        setOpen(false);
    };

    const increment = () => updateQuantity(product.id, inCart.quantity + 1);
    const decrement = () => {
        if (inCart.quantity > 1) updateQuantity(product.id, inCart.quantity - 1);
        else removeFromCart(product.id);
    };

    return (
        <>
            <div className="product__buy" style={{ marginTop: 8 }}>
                {inCart ? (
                    <div className="productDetails">
                        {isProductPage && (
                            <Link to="/cart" className="cardAdd__btn" style={{ marginBottom: 8, display: 'block' }}>
                                Оформить заказ
                            </Link>
                        )}
                        <div className="product__inCart">
                            <button onClick={decrement}>
                                <img className="iconMinus" src={iconMinus} alt="-" />
                            </button>
                            <div className="product__quantity">{inCart.quantity}</div>
                            <button onClick={increment}>
                                <img src={iconPlus} className="iconPlus" alt="+" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setOpen(true)} className="cardAdd__btn">
                        <img src={cardAdd} className="cardAdd" alt="В корзину" />
                    </button>
                )}
            </div>

            <Drawer
                opened={open}
                onClose={() => setOpen(false)}
                position="bottom"
                size="auto"
                radius="lg"
                title={<Text fw={700}>Выберите тип товара</Text>}
                overlayProps={{ opacity: 0.35, blur: 2 }}
            >
                <Stack gap="md" pb="md">
                    <SegmentedControl
                        fullWidth
                        color="greenman"
                        data={product.types.map((type, index) => ({
                            label: type.type,
                            value: String(index)
                        }))}
                        value={String(selectedTypeIndex)}
                        onChange={(val) => setSelectedTypeIndex(Number(val))}
                    />

                    <Group justify="space-between" align="center">
                        <Text fw={700} size="lg" c="greenman">
                            {formatPrice(product.types[selectedTypeIndex].price)}
                        </Text>
                        <Button color="greenman" onClick={handleAddToCart} radius="md">
                            В корзину
                        </Button>
                    </Group>

                    {product.contraindications && (
                        <div className="productInfo__desc contraindications">
                            <Text size="sm" fw={600} mb={4}>Противопоказания:</Text>
                            <Text size="sm" c="dimmed">{product.contraindications}</Text>
                        </div>
                    )}
                </Stack>
            </Drawer>
        </>
    );
};

export default AddToCartControl;
