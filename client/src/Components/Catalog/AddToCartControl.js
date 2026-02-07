import React, {useState} from 'react';
import {useCart} from '../../CartContext';
import cardAdd from '../../images/card__add.svg';
import iconMinus from '../../images/bottom_bar/Icon-minus.svg';
import iconPlus from '../../images/bottom_bar/Icon-plus.svg';
import Sheet from 'react-modal-sheet';
import {Link, useLocation} from "react-router-dom";

const AddToCartControl = ({product}) => {
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const [open, setOpen] = useState(false);
    const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);

    const inCart = cart.find(item => item.id === product.id);

    const handleAddToCart = () => {
        addToCart({ ...product, type: product.types[selectedTypeIndex], quantity });
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
    const location = useLocation();

    const isProductPage = /\/product\/.*/.test(location.pathname);


    return (
       <>
           <div className="product__buy">
               {inCart ? (
                   <div className="productDetails">
                       { isProductPage && (
                           <Link to={'/cart'} onClick={() => setOpen(true)} className="cardAdd__btn">
                               Оформить заказ
                           </Link>
                       )}

                       <div className='product__inCart'>
                           <button onClick={decrementQuantity}>
                               <img className="iconMinus" src={iconMinus} alt=""/>
                           </button>
                           <div className="product__quantity">{inCart.quantity}</div>
                           <button onClick={incrementQuantity}>
                               <img src={iconPlus} className="iconPlus" alt=""/>
                           </button>
                       </div>
                   </div>
               ) : (
                   <button onClick={() => setOpen(true)} className="cardAdd__btn">
                       <img src={cardAdd} className="cardAdd" alt=""/>
                   </button>
               )}
           </div>

           <Sheet isOpen={open} onClose={() => setOpen(false)}>
               <Sheet.Container>
                   <Sheet.Header />
                   <Sheet.Content>

                       <h2 className="product__typeTitle">Выберите тип товара</h2>

                       <div className="product__typeBlock">
                           {product.types.map((type, index) => (
                               <button
                                   key={index}
                                   className={selectedTypeIndex === index ? 'product__type' : 'product__type-active'}
                                   onClick={() => setSelectedTypeIndex(index)}
                               >
                                   {type.type}
                               </button>
                           ))}
                       </div>

                       <div className="product__bottom">
                           <div className="product__Modalprice">
                               {product.types[selectedTypeIndex].price} ₸
                           </div>
                           <button onClick={handleAddToCart}>В корзину</button>
                       </div>
                       <div className="productInfo__desc mt42 contraindications">
                           <h2 className="productInfo__desc--title">Внимательно ознакомьтесь с противопоказаниями:</h2>
                           <ul className='diseases'>
                               <br/>
                               <li  className="disease ">{product.contraindications}</li>
                           </ul>
                       </div>
                   </Sheet.Content>
               </Sheet.Container>
               <Sheet.Backdrop />
           </Sheet>
       </>
    );
};

export default AddToCartControl;
