const Product = require('../models/Product');
const ProductType = require('../models/ProductType');
const indexProductsInMeiliSearch = require('../indexation');
const axios = require('axios'); // Для выполнения HTTP-запросов
const OpenAI = require('openai');
const meiliSearchClient = require('../utilities/meiliSearchClient')
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const assistantId = 'asst_NnLKRpB58h9Xuxiz5Ra1Qkha'; // ID вашего ассистента

const openai = new OpenAI({apiKey: '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'})



const productController = {
    // Добавление нового продукта

    addProduct: async (req, res) => {
        try {
            console.log('Начало обработки запроса на добавление продукта');
            const { name, description, applicationMethodChildren, applicationMethodAdults, diseases, contraindications, types } = req.body;
            let videoUrl = req.file ? req.file.path : null;
            console.log('Полученные данные:', { name, description, applicationMethodChildren, applicationMethodAdults, diseases, contraindications, types, videoUrl });

            const product = await Product.create({
                name,
                description,
                applicationMethodChildren,
                applicationMethodAdults,
                diseases,
                contraindications,
                videoUrl
            });
            console.log('Продукт создан:', product.toJSON());

            let productTypes = [];
            if (types && types.length > 0) {
                productTypes = await Promise.all(types.map(async (type) => {
                    console.log('Обработка типа:', type);
                    const createdType = await ProductType.create({ ...type, productId: product.id });
                    return createdType.toJSON();
                }));
            }
            console.log('Типы продукта:', productTypes);

            console.log('Удаление индекса в MeiliSearch');
            await meiliSearchClient.index('products').delete();
            console.log('Индекс удален');

            console.log('Переиндексация данных');
            await indexProductsInMeiliSearch();
            console.log('Переиндексация завершена');

            const responsePayload = {
                ...product.toJSON(),
                types: productTypes
            };
            console.log('Ответ сервера:', responsePayload);
            res.status(201).json(responsePayload);
        } catch (err) {
            console.error('Ошибка в функции addProduct:', err);
            if (!res.headersSent) {
                res.status(400).json({ error: err.message });
            }
        }
    },


    getProductsByIdsAndTypes: async (req, res) => {
        try {
            const idsAndTypes = req.body.ids; // Пример: [{ productId: 1, typeIndex: 0 }, { productId: 2, typeIndex: 1 }]
            const productsInfo = await Promise.all(idsAndTypes.map(async item => {
                const product = await Product.findByPk(item.productId, {
                    include: [{
                        model: ProductType,
                        as: 'types'
                    }]
                });

                if (!product || !product.types[item.typeIndex]) {
                    return null;
                }

                return {
                    id: product.id,
                    name: product.name,
                    type: product.types[item.typeIndex]
                };
            }));

            res.json(productsInfo.filter(info => info !== null));
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    },


    getAllProducts: async (req, res) => {
        try {
            const products = await Product.findAll({
                include: [{model: ProductType, as: 'types'}]
            });
            res.json(products);
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    },

    getProductById: async (req, res) => {
        try {
            const product = await Product.findByPk(req.params.id, {
                include: [{model: ProductType, as: 'types'}]
            });
            if (product) {
                res.json(product);
            } else {
                res.status(404).json({error: 'Продукт не найден'});
            }
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    },

    // Обновление продукта
    updateProduct: async (req, res) => {
        try {
            const {name, description, applicationMethod, diseases, contraindications} = req.body;
            let videoUrl = req.file ? req.file.path : null;


            const updated = await Product.update({
                name,
                description,
                applicationMethod,
                diseases,
                contraindications,
                videoUrl
            }, {where: {id: req.params.id}});
            if (updated[0] > 0) {
                const updatedProduct = await Product.findByPk(req.params.id);
                // Обновление в MeiliSearch
                try {
                    await meiliSearchClient.index('products').updateDocuments([updatedProduct.toJSON()]);
                } catch (meiliError) {
                    console.error('Ошибка обновления индекса в MeiliSearch:', meiliError);
                }
                res.json(updatedProduct);
            } else {
                res.status(404).json({error: 'Продукт не найден'});
            }
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    },

// Удаление продукта
    deleteProduct: async (req, res) => {
        try {
            const deleted = await Product.destroy({ where: { id: req.params.id } });
            if (deleted) {
                console.log('Продукт удален из базы данных');

                // Удаление полного индекса в MeiliSearch
                try {
                    await meiliSearchClient.index('products').delete();
                    console.log('Индекс продуктов в MeiliSearch полностью удален');
                } catch (meiliError) {
                    console.error('Ошибка удаления индекса в MeiliSearch:', meiliError);
                    return res.status(500).json({ error: 'Ошибка удаления индекса: ' + meiliError.message });
                }

                // Переиндексация данных в MeiliSearch
                try {
                    await indexProductsInMeiliSearch();
                    console.log('Переиндексация данных в MeiliSearch выполнена');
                } catch (indexError) {
                    console.error('Ошибка переиндексации данных:', indexError);
                    return res.status(500).json({ error: 'Ошибка переиндексации данных: ' + indexError.message });
                }

                res.status(204).send();
            } else {
                res.status(404).json({ error: 'Продукт не найден' });
            }
        } catch (err) {
            console.error('Ошибка при удалении продукта:', err);
            res.status(500).json({ error: err.message });
        }
    },


// Объединенная функция поиска продуктов
    searchProducts: async (req, res) => {
        const { name } = req.params;
        const searchType = req.query.type || 'name'; // Тип поиска: name или disease

        try {
            // Определяем атрибуты для поиска на основе типа запроса
            const attributesToSearchOn = searchType === 'disease' ? ['diseases'] : ['name'];

            const searchResults = await meiliSearchClient.index('products').search(name, {
                attributesToRetrieve: ['id'],
                limit: 20,
                attributesToSearchOn: attributesToSearchOn
            });

            const ids = searchResults.hits.map(hit => hit.id);

            const products = await Product.findAll({
                where: {
                    id: {
                        [Op.in]: ids
                    }
                },
                include: [{
                    model: ProductType,
                    as: 'types'
                }]
            });

            if (products.length > 0) {
                res.json(products);
            } else {
                res.status(404).json({ error: 'Продукты не найдены' });
            }
        } catch (err) {
            res.status(500).json({ error: 'Ошибка поиска: ' + err.message });
        }
    },


    // searchProductsByDisease: async (req, res) => {
    //     try {
    //         const { disease } = req.body; // Получаем 'disease' из тела запроса
    //
    //         if (!disease) {
    //             return res.status(400).send('Не указана болезнь');
    //         }
    //
    //         const response = await axios.post('http://localhost:5000/search', {
    //             query: disease
    //         }, {
    //             timeout: 300000  // Установка таймаута в 5 минут
    //         });
    //
    //         if (response.status === 200) {
    //             const data = JSON.parse(response.data.response); // Преобразуем строку в массив ID
    //             const products = await Product.findAll({
    //                 where: {
    //                     id: {
    //                         [Op.in]: data  // Используем распарсенные ID для поиска продуктов
    //                     }
    //                 },
    //                 include: [{
    //                     model: ProductType,
    //                     as: 'types'
    //                 }]
    //             });
    //
    //             res.json(products); // Возвращает полные данные о продуктах
    //         } else {
    //             res.status(500).send('Ошибка сервера при обработке запроса');
    //         }
    //     } catch (error) {
    //         if (error.code === 'ECONNABORTED') {
    //             console.error('Таймаут запроса к Python-сервису');
    //             res.status(504).send('Превышено время ожидания сервера');
    //         } else {
    //             console.error('Ошибка при запросе:', error);
    //             res.status(500).send('Ошибка при обработке запроса');
    //         }
    //     }
    // }

};

module.exports = productController;
