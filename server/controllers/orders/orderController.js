const Order = require('../../models/orders/Order');
const sendNotification = require('../../utilities/notificationService');
const { sendOrderTrackingTemplate } = sendNotification;
const OrderProfile = require("../../models/orders/OrderProfile");
const jwtUtility = require('../../utilities/jwtUtility');
const sendMessageToChannel = require('../../utilities/sendMessageToChannel');
const productController = require("../productController");
const ProductType = require('../../models/ProductType');
const {
    attachRecentPaymentLinkToOrder,
    markPaymentLinkConnectionAsUsed,
    canAutoMarkOrderAsPaidByConnection
} = require('../../utilities/paymentLinkUtils');

const orderController = {

    // Добавление нового заказа
    addOrder: async (req, res) => {
        const decreasedStocks = [];

        try {
            console.log("Начало обработки запроса на добавление заказа");
            let userId = null;

            if (req.headers.authorization) {
                const token = req.headers.authorization.split(' ')[1];
                try {
                    const decoded = jwtUtility.verifyToken(token);
                    userId = decoded.userId;
                } catch (error) {
                    return res.status(401).json({message: 'Неверный токен'});
                }
            }

            const {
                customerName,
                addressIndex,
                city,
                street,
                houseNumber,
                phoneNumber,
                deliveryMethod,
                paymentMethod,
                products,
                totalPrice,
                kaspiNumber,
                country,
                email,
                cdekCityCode,
                cdekAddress,
                cdekCalcPriceRub,
                cdekDeliveryMode,
                cdekPvzCode,
                cdekPvzName,
                cdekPvzAddress
            } = req.body;

            console.log("Полученные данные:", req.body);

            const normalizedCountry = country === 'RF' ? 'RF' : 'KZ';
            const isRfOrder = normalizedCountry === 'RF';
            const normalizedCdekDeliveryMode = String(cdekDeliveryMode || 'door').trim().toLowerCase() === 'pvz' ? 'pvz' : 'door';

            if (isRfOrder) {
                if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
                    return res.status(400).json({ error: 'Для заказа в РФ требуется корректный email' });
                }
                if (!cdekCityCode) {
                    return res.status(400).json({ error: 'Для заказа в РФ требуется cdekCityCode' });
                }
                if (normalizedCdekDeliveryMode === 'door' && (!cdekAddress || !String(cdekAddress).trim())) {
                    return res.status(400).json({ error: 'Для заказа в РФ требуется cdekAddress' });
                }
                if (normalizedCdekDeliveryMode === 'pvz' && !String(cdekPvzCode || '').trim()) {
                    return res.status(400).json({ error: 'Для заказа в РФ с выдачей в ПВЗ требуется cdekPvzCode' });
                }
                const phoneDigits = String(phoneNumber || '').replace(/\D/g, '');
                if (phoneDigits.length < 11 || phoneDigits.length > 12) {
                    return res.status(400).json({ error: 'Некорректный номер телефона для РФ (нужен формат +7XXXXXXXXXX)' });
                }
            }

            let orderData = {
                deliveryMethod: isRfOrder ? 'cdek' : deliveryMethod,
                paymentMethod: isRfOrder ? 'cod' : paymentMethod,
                products,
                totalPrice,
                userId,
                customerName,
                addressIndex: isRfOrder ? null : addressIndex,
                city: isRfOrder ? (req.body.cdekCityLabel || '') : city,
                street,
                houseNumber,
                phoneNumber: isRfOrder
                    ? (String(phoneNumber || '').startsWith('+') ? phoneNumber : `+${String(phoneNumber || '').replace(/\D/g, '')}`)
                    : phoneNumber,
                kaspiNumber: isRfOrder ? null : kaspiNumber,
                country: normalizedCountry,
                currency: isRfOrder ? 'RUB' : 'KZT',
                email: email || null,
                cdekCityCode: isRfOrder ? Number(cdekCityCode) : null,
                cdekDeliveryMode: isRfOrder ? normalizedCdekDeliveryMode : null,
                cdekAddress: isRfOrder
                    ? (normalizedCdekDeliveryMode === 'door' ? cdekAddress : (cdekPvzAddress || null))
                    : null,
                cdekPvzCode: isRfOrder && normalizedCdekDeliveryMode === 'pvz' ? String(cdekPvzCode || '').trim() : null,
                cdekPvzName: isRfOrder && normalizedCdekDeliveryMode === 'pvz' ? (cdekPvzName || null) : null,
                cdekPvzAddress: isRfOrder && normalizedCdekDeliveryMode === 'pvz' ? (cdekPvzAddress || null) : null,
                cdekCalcPriceRub: isRfOrder ? Number(cdekCalcPriceRub) || null : null
            };

            const paymentLinkConnection = await attachRecentPaymentLinkToOrder(orderData, phoneNumber);
            if (String(paymentMethod || '').trim().toLowerCase() === 'link') {
                const paymentLink = String(orderData.paymentLink || '').trim();
                const paymentSellerIin = String(orderData.paymentSellerIin || '').replace(/\D/g, '');
                const paymentSellerName = String(orderData.paymentSellerName || '').trim();
                if (!paymentLink || paymentSellerIin.length !== 12 || !paymentSellerName) {
                    return res.status(400).json({
                        error: 'Заказ со способом оплаты "link" нельзя создать без ссылки и администратора'
                    });
                }

                orderData.paymentLink = paymentLink;
                orderData.paymentSellerIin = paymentSellerIin;
                orderData.paymentSellerName = paymentSellerName;
            }
            if (canAutoMarkOrderAsPaidByConnection(paymentLinkConnection, totalPrice)) {
                orderData.status = 'Оплачено';
            }

            if (userId && !isRfOrder) {
                const profileData = {
                    userId,
                    name: customerName,
                    addressIndex,
                    city,
                    street,
                    houseNumber,
                    phoneNumber,
                    kaspiNumber
                };

                let existingProfile = await OrderProfile.findOne({where: profileData});

                if (!existingProfile) {
                    existingProfile = await OrderProfile.create(profileData);
                }

                orderData.orderProfileId = existingProfile.id;
            }

            const stockUpdates = [];

            for (const item of products) {
                const requestedQuantity = Math.max(0, Number(item.quantity) || 0);
                const productType = await ProductType.findByPk(item.typeId);

                if (!productType) {
                    return res.status(400).json({ error: `Тип товара с ID ${item.typeId} не найден` });
                }

                if (requestedQuantity <= 0) {
                    return res.status(400).json({ error: 'Количество товара должно быть больше нуля' });
                }

                // null = бесконечный остаток
                if (productType.stockQuantity !== null) {
                    if (productType.stockQuantity < requestedQuantity) {
                        return res.status(400).json({
                            error: `Недостаточно товара на складе: ${productType.type}. Осталось ${productType.stockQuantity} шт.`
                        });
                    }

                    stockUpdates.push({ productType, requestedQuantity });
                }
            }

            for (const stockUpdate of stockUpdates) {
                await stockUpdate.productType.update({
                    stockQuantity: stockUpdate.productType.stockQuantity - stockUpdate.requestedQuantity
                });

                decreasedStocks.push({
                    productTypeId: stockUpdate.productType.id,
                    quantity: stockUpdate.requestedQuantity
                });
            }

            const newOrder = await Order.create(orderData);
            if (paymentLinkConnection?.id) {
                const isLinked = await markPaymentLinkConnectionAsUsed(paymentLinkConnection.id, newOrder.id);
                if (!isLinked) {
                    await newOrder.destroy();
                    const conflictError = new Error('Эта связь уже привязана к другому заказу');
                    conflictError.statusCode = 409;
                    throw conflictError;
                }
            }
            console.log("Заказ создан:", newOrder);
            await sendMessageToChannel(newOrder);

            const productsInfo = await Promise.all(products.map(async product => {
                const productResponse = await productController.getProductByIdServer(product.productId);
                if (!productResponse) {
                    return { error: "Продукт не найден" };
                }
                const productType = productResponse.types.find(type => type.id === product.typeId);
                return {
                    productId: product.productId,
                    name: productResponse.name,
                    type: productType ? productType.type : 'Тип не найден',
                    quantity: product.quantity
                };
            }));

            const productDetails = productsInfo.map(product => `
Название: ${product.name}
Тип: ${product.type}
Количество: ${product.quantity}
`).join('\n');

            const currencyLabel = isRfOrder ? 'рублей' : 'тенге';
            const addressLine = isRfOrder
                ? (normalizedCdekDeliveryMode === 'pvz'
                    ? `${orderData.city}, ПВЗ ${orderData.cdekPvzCode || ''}${orderData.cdekPvzAddress ? `, ${orderData.cdekPvzAddress}` : ''}`
                    : `${orderData.city}, ${cdekAddress}`)
                : `${street}, ${houseNumber}`;
            const deliveryLabel = normalizedCdekDeliveryMode === 'pvz'
                ? 'СДЭК (дверь-ПВЗ)'
                : 'СДЭК (дверь-дверь)';
            const deliveryDestination = normalizedCdekDeliveryMode === 'pvz'
                ? `ПВЗ: *${orderData.cdekPvzName || orderData.cdekPvzCode || '—'}*\nАдрес ПВЗ: *${orderData.cdekPvzAddress || '—'}*`
                : `Адрес: *${cdekAddress}*`;

            const notificationMessage = isRfOrder ? `
Имя и Фамилия: *${customerName}*
Номер телефона: *${orderData.phoneNumber}*
Email: *${email}*
Город: *${orderData.city}*
${deliveryDestination}
Метод доставки: *${deliveryLabel}*
Метод оплаты: *Наличными при получении*
Итоговая сумма: *${totalPrice}* ${currencyLabel}

*Товары*:
${productDetails}` : `
Имя и Фамилия: *${customerName}*
Номер телефона: *${phoneNumber}*
Номер телефона Kaspi: *${kaspiNumber}*
Город: *${city}*
Адрес: *${addressLine}*
Почтовый индекс: *${addressIndex}*
Метод доставки: *${deliveryMethod}*
Метод оплаты: *${paymentMethod}*
Итоговая сумма: *${totalPrice}* ${currencyLabel}

*Товары*:
${productDetails}`;

await sendNotification(orderData.phoneNumber, notificationMessage);
if (isRfOrder) {
    await sendNotification(
        orderData.phoneNumber,
        normalizedCdekDeliveryMode === 'pvz'
            ? `Ваш заказ принят. Забрать посылку можно будет в выбранном ПВЗ СДЭК. Оплата наличными при получении — *${totalPrice}* ${currencyLabel}.`
            : `Ваш заказ принят. Курьер СДЭК свяжется с вами. Оплата наличными при получении — *${totalPrice}* ${currencyLabel}.`
    );
} else {
    await sendNotification(phoneNumber, `Ваш заказ создан. Оплатите счет на сумму *${totalPrice}* тенге в приложении Каспи.`);
}

console.log("Уведомление отправлено на номер:", orderData.phoneNumber);

res.status(201).json(newOrder);
} catch (err) {
if (decreasedStocks.length > 0) {
    await Promise.all(
        decreasedStocks.map(async (item) => {
            const productType = await ProductType.findByPk(item.productTypeId);
            if (!productType || productType.stockQuantity === null) {
                return;
            }

            await productType.update({
                stockQuantity: productType.stockQuantity + item.quantity
            });
        })
    );
}

console.error("Ошибка при добавлении заказа:", err);
res.status(err.statusCode || 500).json({error: err.message});
}
},


    // Получение всех заказов
    getAllOrders: async (req, res) => {
        try {
            const orders = await Order.findAll();
            res.json(orders);
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    },

    getOrdersByUserId: async (req, res) => {
        try {
            const {userId} = req.params;
            const orders = await Order.findAll({where: {userId}});
            res.json(orders);
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    },


    getOrderById: async (req, res) => {
        const {id} = req.params;
        try {
            const order = await Order.findByPk(id);
            if (!order) {
                return res.status(404).json({error: 'Заказ не найден'});
            }

            // Получаем информацию о продуктах в заказе
            const productsInfo = await Promise.all(order.products.map(async product => {
                const productResponse = await productController.getProductByIdServer(product.productId);
                if (!productResponse) {
                    return {
                        productId: product.productId,
                        productName: 'Продукт не найден',
                        typeId: product.typeId,
                        type: 'Тип не найден',
                        price: product.price || 0,
                        quantity: product.quantity || 1
                    };
                }

                const productType = productResponse.types.find(type => type.id === product.typeId);
                return {
                    productId: product.productId,
                    productName: productResponse.name,
                    typeId: product.typeId,
                    type: productType ? productType.type : 'Тип не найден',
                    price: productType ? productType.price : (product.price || 0),
                    quantity: product.quantity
                };
            }));

            // Собираем итоговый ответ
            const response = {
                ...order.dataValues,
                products: productsInfo
            };

            res.json(response);
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    },

    // Обновление заказа
    updateOrder: async (req, res) => {
        try {
            const {
                customerName,
                addressIndex,
                city,
                street,
                houseNumber,
                phoneNumber,
                deliveryMethod,
                paymentMethod,
                products,
                totalPrice,
                kaspiNumber,
                status
            } = req.body;
            const cleanPhoneNumber = phoneNumber.replace('+7', '');

            const updated = await Order.update({
                customerName,
                addressIndex,
                city,
                street,
                houseNumber,
                phoneNumber: cleanPhoneNumber,
                deliveryMethod,
                paymentMethod,
                products,
                totalPrice,
                kaspiNumber,
                status
            }, {where: {id: req.params.id}});

            if (updated[0] > 0) {
                const updatedOrder = await Order.findByPk(req.params.id);
                res.json(updatedOrder);
            } else {
                res.status(404).json({error: 'Заказ не найден'});
            }
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    },

    // Удаление заказа
    deleteOrder: async (req, res) => {
        try {
            const deleted = await Order.destroy({where: {id: req.params.id}});
            if (deleted) {
                res.status(204).send();
            } else {
                res.status(404).json({error: 'Заказ не найден'});
            }
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    },

    // Обновление статуса заказа
    updateOrderStatus: async (req, res) => {
        try {
            const {status} = req.body;
            const order = await Order.findByPk(req.params.id);
            const updated = await Order.update({status}, {where: {id: req.params.id}});

            if (updated[0] > 0) {
                // Отправка уведомления об изменении статуса
                await sendNotification(order.phoneNumber, `Статус вашего заказа изменен на: ${status}`);
                res.json({message: 'Статус заказа обновлен.'});
            } else {
                res.status(404).json({error: 'Заказ не найден'});
            }
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    },

    // Добавление трек-номера
    addTrackingNumber: async (req, res) => {
        try {
            const {trackingNumber} = req.body;
            const order = await Order.findByPk(req.params.id);
            if (!order) {
                return res.status(404).json({error: 'Заказ не найден'});
            }

            const safeTrackingNumber = String(trackingNumber || '').trim();
            if (!safeTrackingNumber) {
                return res.status(400).json({error: 'Трек-номер не указан'});
            }

            if (String(order.trackingNumber || '').trim() === safeTrackingNumber) {
                return res.json({message: 'Этот трек-номер уже сохранен.'});
            }

            const updated = await Order.update({trackingNumber: safeTrackingNumber}, {where: {id: req.params.id, status: 'Оплачено'}});
            const number = order.phoneNumber;

            if (updated[0] > 0) {
                await sendOrderTrackingTemplate(number, safeTrackingNumber);

                // Отправка запроса на track.greenman.kz
                const response = await fetch(`https://track.greenman.kz/add/${safeTrackingNumber}`, {method: 'GET'});
                const responseData = await response.json();


                res.json({message: 'Трек-номер добавлен.', greenmanResponse: responseData});
            } else {
                res.status(404).json({error: 'Заказ не найден или еще не оплачен.'});
            }
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    },

    getUserOrders: async (req, res) => {
        try {
            const userId = req.user?.id || req.user?.userId;
            if (!userId) return res.status(401).json({error: 'Нужна авторизация'});
            const profiles = await OrderProfile.findAll({where: {userId}});
            const phoneNumbers = profiles.map(profile => profile.phoneNumber);

            const ordersByPhone = await Order.findAll({where: {phoneNumber: phoneNumbers}});
            const ordersByUserId = await Order.findAll({where: {userId}});

            // Объединяем заказы и убираем дубликаты
            const allOrders = [...ordersByPhone, ...ordersByUserId].reduce((acc, current) => {
                if (!acc.find(order => order.id === current.id)) {
                    acc.push(current);
                }
                return acc;
            }, []);

            res.json(allOrders);
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    },
};

module.exports = orderController;
