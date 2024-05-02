const Order = require('../../models/orders/Order');
const sendNotification = require('../../utilities/notificationService');
const OrderProfile = require("../../models/orders/OrderProfile");
const jwtUtility = require('../../utilities/jwtUtility');
const sendMessageToChannel = require('../../utilities/sendMessageToChannel');
const Product = require("../../models/Product");
const ProductType = require("../../models/ProductType");

const orderController = {

    // Добавление нового заказа
    addOrder: async (req, res) => {
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
                kaspiNumber
            } = req.body;

            console.log("Полученные данные:", req.body);

            let orderData = {
                deliveryMethod,
                paymentMethod,
                products,
                totalPrice,
                userId,
                customerName,
                addressIndex,
                city,
                street,
                houseNumber,
                phoneNumber,
                kaspiNumber
            };

            if (userId) {
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

                // Поиск существующего профиля, который полностью соответствует предоставленным данным
                let existingProfile = await OrderProfile.findOne({where: profileData});

                // Если соответствующий профиль не найден, создаётся новый
                if (!existingProfile) {
                    existingProfile = await OrderProfile.create(profileData);
                }

                orderData.orderProfileId = existingProfile.id;
            }

            const newOrder = await Order.create(orderData);
            console.log("Заказ создан:", newOrder);
            await sendMessageToChannel(newOrder);

            await sendNotification(phoneNumber, `Ваш заказ создан. Оплатите счет в на сумму ${totalPrice} тенге в приложении каспи. `);
            console.log("Уведомление отправлено на номер:", phoneNumber);

            res.status(201).json(newOrder);
        } catch (err) {
            console.error("Ошибка при добавлении заказа:", err);
            res.status(500).json({error: err.message});
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


    // Получение заказа по ID с информацией о продуктах и их типах
    getOrderById: async (req, res) => {
        const {id} = req.params;  // Получение ID заказа из параметров запроса
        try {
            const order = await Order.findByPk(id, {
                include: [{
                    model: Product,  // Включаем модель Product в запрос
                    as: 'products',  // 'products' должно быть определено в модели Order как ассоциация
                    include: [{
                        model: ProductType,  // Включаем модель ProductType в запрос
                        as: 'types'  // 'types' должно быть определено в модели Product как ассоциация
                    }]
                }]
            });

            if (!order) {
                return res.status(404).json({error: 'Заказ не найден'});
            }

            // Подготовка данных о продуктах с типами для ответа
            const productsInfo = order.products.map(product => {
                return {
                    productId: product.id,
                    productName: product.name,
                    productTypes: product.types.map(type => type.type)  // Возвращаем только названия типов
                };
            });

            // Возврат информации о заказе с информацией о продуктах и их типах
            res.json({
                orderId: order.id,
                products: productsInfo
            });
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
            const updated = await Order.update({trackingNumber}, {where: {id: req.params.id, status: 'Оплачено'}});

            if (updated[0] > 0) {

                // Отправка запроса на track.greenman.kz
                const response = await fetch(`https://greenman.kz/add/${trackingNumber}`, {method: 'GET'});
                const responseData = await response.json();

                // Отправка уведомления о трек-номере
                await sendNotification(order.phoneNumber, `Трек-номер вашего заказа: ${trackingNumber}. Отследить посылку можете по ссылке: https://track.greenman.kz/${trackingNumber}`);

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
            const userId = req.user.id;
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
