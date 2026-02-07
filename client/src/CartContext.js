import React, { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        const storedCart = localStorage.getItem('cart');
        return storedCart ? JSON.parse(storedCart) : [];
    });

    // Загрузка корзины из localStorage при инициализации
    useEffect(() => {
        try {
            const storedCart = localStorage.getItem('cart');
            if (storedCart) {
                const parsedCart = JSON.parse(storedCart);
                if (Array.isArray(parsedCart)) {
                    setCart(parsedCart);
                }
            }
        } catch (error) {
            console.error('Ошибка при загрузке корзины:', error);
            // Обработка ошибки или установка корзины в пустое состояние
        }
    }, []);

    // Сохранение корзины в localStorage при каждом обновлении
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product) => {
        setCart(prev => [...prev, product]);
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, quantity) => {
        setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity } : item));
    };

    const clearCart = () => {
        setCart([]);
    };

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};
