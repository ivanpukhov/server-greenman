import React, {useState} from 'react';
import {useCart} from '../../CartContext';
import {NavLink} from "react-router-dom";
import AddToCartControl from "./AddToCartControl";

const Product = ({product}) => {
    const {cart, addToCart, updateQuantity, removeFromCart} = useCart();
    const [open, setOpen] = useState(false);
    const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);

    const inCart = cart.find(item => item.id === product.id);

    const handleAddToCart = () => {
        addToCart({...product, type: product.types[selectedTypeIndex], quantity});
        setOpen(false);
    };

    const incrementQuantity = () => {
        updateQuantity(product.id, inCart.quantity + 1);
    };

    const decrementQuantity = () => {
        if (inCart.quantity > 1) {
            updateQuantity(product.id, inCart.quantity - 1);
        } else {
            handleRemoveFromCart();
        }
    };

    const handleRemoveFromCart = () => {
        removeFromCart(product.id);
        setOpen(false);
    };

    const truncateString = (str, num = 79) => {
        return str.length > num ? str.slice(0, num) + '...' : str;
    };
    return (<div className="product">
        <NavLink to={`/product/${product.id}`} className="product__text">
            <h2 className="product__name">{product.name}</h2>
            <p className="product__desc">{truncateString(product.description)}</p>
            <div className="product__price">Узнать подробнее</div>
        </NavLink>
        <AddToCartControl product={product}/>


    </div>);
};

export default Product;
