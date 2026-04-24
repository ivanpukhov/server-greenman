const User = require('../../models/orders/User');
const OrderProfile = require('../../models/orders/OrderProfile');
const Order = require('../../models/orders/Order');
const Product = require("../../models/Product");
const ProductType = require("../../models/ProductType");
const ProductReview = require('../../models/ProductReview');
const ensureUserProfileSchema = require('../../utilities/ensureUserProfileSchema');
const {
    Bookmark,
    Comment,
    CourseDayProgress,
    CourseDayReport,
    CourseEnrollment,
    CourseSupportMessage,
    PollVote,
    Reaction,
    ReelView,
    Repost,
    SocialNotification,
    StoryView
} = require('../../models/social');

function sanitizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function serializeUser(user) {
    const firstName = user.firstName || null;
    const lastName = user.lastName || null;
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || null;
    return {
        id: user.id,
        phoneNumber: user.phoneNumber,
        firstName,
        lastName,
        displayName,
        requiresProfile: !firstName || !lastName
    };
}

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
            await ensureUserProfileSchema();
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
                user: serializeUser(user),
                phoneNumber: user.phoneNumber,
                firstName: user.firstName || null,
                lastName: user.lastName || null,
                displayName: serializeUser(user).displayName,
                requiresProfile: serializeUser(user).requiresProfile,
                orderProfiles,
                orders
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({message: 'Ошибка при получении данных пользователя', error});
        }
    },

    async updateUserProfile(req, res) {
        try {
            await ensureUserProfileSchema();
            const userId = req.user.userId;
            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({message: 'Пользователь не найден'});
            }

            const firstName = sanitizeName(req.body?.firstName);
            const lastName = sanitizeName(req.body?.lastName);

            if (!firstName || !lastName) {
                return res.status(400).json({message: 'Имя и фамилия обязательны'});
            }

            user.firstName = firstName;
            user.lastName = lastName;
            await user.save();

            res.json(serializeUser(user));
        } catch (error) {
            console.error('Ошибка при обновлении профиля пользователя:', error);
            res.status(500).json({
                message: 'Ошибка при обновлении профиля',
                detail: error.message
            });
        }
    },

    async deleteAccount(req, res) {
        try {
            await ensureUserProfileSchema();
            const userId = req.user.userId;
            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({message: 'Пользователь не найден'});
            }
            const enrollments = await CourseEnrollment.findAll({
                where: {userId},
                attributes: ['id']
            });
            const enrollmentIds = enrollments.map((e) => e.id);

            if (enrollmentIds.length) {
                await Promise.all([
                    CourseDayReport.destroy({where: {enrollmentId: enrollmentIds}}),
                    CourseDayProgress.destroy({where: {enrollmentId: enrollmentIds}}),
                    CourseSupportMessage.destroy({where: {enrollmentId: enrollmentIds}})
                ]);
            }

            await Promise.all([
                OrderProfile.destroy({where: {userId}}),
                Order.update({userId: null}, {where: {userId}}),
                ProductReview.destroy({where: {userId}}),
                Bookmark.destroy({where: {userId}}),
                Reaction.destroy({where: {userId}}),
                Repost.destroy({where: {userId}}),
                ReelView.destroy({where: {userId}}),
                StoryView.destroy({where: {userId}}),
                PollVote.destroy({where: {userId}}),
                CourseEnrollment.destroy({where: {userId}}),
                SocialNotification.destroy({where: {userId}}),
                Comment.update({isDeleted: true}, {where: {userId}})
            ]);

            await user.destroy();
            res.json({ok: true});
        } catch (error) {
            res.status(500).json({message: 'Ошибка при удалении аккаунта', error});
        }
    }

};

module.exports = OrderProfileController;
