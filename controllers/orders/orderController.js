const Order = require('../../models/orders/Order');
const sendNotification = require('../../utilities/notificationService');
const OrderProfile = require("../../models/orders/OrderProfile");
const jwtUtility = require('../../utilities/jwtUtility');
const sendMessageToChannel = require('../../utilities/sendMessageToChannel');
const productController = require("../productController");

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
            const updated = await Order.update({trackingNumber}, {where: {id: req.params.id, status: 'Оплачено'}});
            const number = order.phoneNumber;
            console.log(number)
            console.log(number)
            console.log(number)
            console.log(number)
            console.log(number)
            console.log(number)
            console.log(number)
            console.log(number)
            console.log(number)
            console.log(number)
            console.log(number)
            console.log(number)
            // Отправка уведомления о трек-номере

            await sendNotification(number, `Трек-номер вашего заказа: ${trackingNumber}. Отследить посылку можете по ссылке: https://track.greenman.kz/${trackingNumber}`);

            if (updated[0] > 0) {

                // Отправка запроса на track.greenman.kz
                const response = await fetch(`https://track.greenman.kz/add/${trackingNumber}`, {method: 'GET'});
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
