const User = require('../../models/orders/User');
const OrderProfile = require('../../models/orders/OrderProfile');
const Order = require('../../models/orders/Order');
const Product = require("../../models/Product");
const ProductType = require("../../models/ProductType");

const OrderProfileController = {
    // Создание нового профиля заказа
    async createOrderProfile(req, res) {
        try {
            const {userId, name, addressIndex, city, street, houseNumber, phoneNumber} = req.body; // Добавлен phoneNumber
            // Проверка существования пользователя
            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({message: 'Пользователь не найден'});
            }

            const orderProfile = await OrderProfile.create({
                userId,
                name,
                addressIndex,
                city,
                street,
                houseNumber,
                phoneNumber // Добавлено сохранение номера телефона
            });

            res.status(201).json(orderProfile);
        } catch (error) {
            res.status(500).json({message: 'Ошибка при создании профиля заказа', error});
        }
    },

    // Получение всех профилей заказов пользователя
    async getOrderProfiles(req, res) {
        try {
            const {userId} = req.params;
            const orderProfiles = await OrderProfile.findAll({where: {userId}});
            res.json(orderProfiles);
        } catch (error) {
            res.status(500).json({message: 'Ошибка при получении профилей заказов', error});
        }
    },

    // Обновление профиля заказа
    async updateOrderProfile(req, res) {
        try {
            const {profileId} = req.params;
            const updatedData = req.body;

            const updated = await OrderProfile.update(updatedData, {where: {id: profileId}});

            if (updated[0] > 0) {
                const updatedProfile = await OrderProfile.findByPk(profileId);
                res.json(updatedProfile);
            } else {
                res.status(404).json({message: 'Профиль заказа не найден'});
            }
        } catch (error) {
            res.status(500).json({message: 'Ошибка при обновлении профиля заказа', error});
        }
    },

    // Удаление профиля заказа
    async deleteOrderProfile(req, res) {
        try {
            const {profileId} = req.params;
            const deleted = await OrderProfile.destroy({where: {id: profileId}});

            if (deleted) {
                res.status(204).send();
            } else {
                res.status(404).json({message: 'Профиль заказа не найден'});
            }
        } catch (error) {
            res.status(500).json({message: 'Ошибка при удалении профиля заказа', error});
        }
    },
    async findOrderByPhoneNumber(req, res) {
        try {
            const {phoneNumber} = req.params;
            const orderProfile = await OrderProfile.findOne({where: {phoneNumber}});

            if (orderProfile) {
                return res.json(true);
            } else {
                return res.json(false);
            }
        } catch (error) {
            res.status(500).json({message: 'Ошибка при поиске профиля заказа по номеру телефона', error});
        }
    },

    async  getUserDetails(req, res) {
        try {
            const userId = req.user.userId;
            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({message: 'Пользователь не найден'});
            }

            const orderProfiles = await OrderProfile.findAll({where: {userId}});
            let orders = await Order.findAll({where: {userId}});

            // Перебор заказов и запрос информации о продуктах и типах продуктов
            orders = await Promise.all(orders.map(async (order) => {
                const productsWithDetails = await Promise.all(order.products.map(async (product) => {
                    const productDetail = await Product.findByPk(product.productId);
                    const typeDetail = await ProductType.findByPk(product.typeId);
                    return {
                        productId: product.productId,
                        product: productDetail ? productDetail.name : null,
                        quantity: product.quantity,
                        typeId: product.typeId,
                        type: typeDetail ? typeDetail.type : null,
                    };
                }));

                return {
                    ...order.toJSON(), // или order.get({ plain: true })
                    products: productsWithDetails
                };
            }));

            res.json({
                phoneNumber: user.phoneNumber,
                orderProfiles,
                orders
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Ошибка при получении данных пользователя', error});
        }
    }


};

module.exports = OrderProfileController;
