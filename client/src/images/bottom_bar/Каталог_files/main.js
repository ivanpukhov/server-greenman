//base

document.addEventListener('DOMContentLoaded', function() {
    var catalogButton = document.querySelector('.header__btn-catalog');
    var catalog = document.querySelector('.header__catalog');

    catalogButton.addEventListener('click', function() {
        catalogButton.classList.toggle('active');
        catalog.classList.toggle('none');
    });
});


document.addEventListener('DOMContentLoaded', function () {
    const modalCall = document.querySelector('.modal--call');
    const headerCall = document.querySelector('.header__call');
    const modalClose = document.querySelector('.modal--call__close');

    headerCall.addEventListener('click', function () {
        modalCall.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Блокировка скролла на основной странице
    });

    modalClose.addEventListener('click', function () {
        modalCall.style.display = 'none';
        document.body.style.overflow = ''; // Возврат к стандартному скроллу
    });
});
//finish-base
document.addEventListener('DOMContentLoaded', () => {
    const cartItemsContainer = document.querySelector('.cart');
    const carCircle = document.querySelector('.cart__circle');
    const deleteAllButton = document.querySelector('.delete__all');

    const updateCarCircle = () => {
        const cartItems = cartItemsContainer.querySelectorAll('.cart__item');
        let totalQuantity = 0;
        cartItems.forEach(item => {
            const quantityInput = item.querySelector('.product__quantity input');
            totalQuantity += parseInt(quantityInput.value) || 0;
        });

        if (totalQuantity > 0) {
            carCircle.style.display = 'flex';
            carCircle.textContent = totalQuantity;
        } else {
            carCircle.style.display = 'none';
        }
    };

    const deleteItem = (item) => {
        cartItemsContainer.removeChild(item);
        updateCarCircle();
    };

    const deleteAllItems = () => {
        cartItemsContainer.innerHTML = '';
        updateCarCircle();
    };

    cartItemsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('product__delete')) {
            const item = event.target.closest('.cart__item');
            if (item) deleteItem(item);
        }
    });

    deleteAllButton.addEventListener('click', deleteAllItems);

    updateCarCircle(); // Инициализируем счетчик при загрузке страницы
});
