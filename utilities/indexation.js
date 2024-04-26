const meiliSearchClient = require('./meiliSearchClient');
const Product = require('../models/Product');

async function indexProducts() {
    try {
        // Получение всех продуктов из базы данных
        const products = await Product.findAll({
            include: [{ all: true }]
        });

        // Подготовка продуктов для индексации
        const formattedProducts = products.map(product => product.toJSON());

        // Очистка существующего индекса (опционально)
        await meiliSearchClient.index('products').deleteAllDocuments();

        // Индексация продуктов
        await meiliSearchClient.index('products').addDocuments(formattedProducts);

        console.log('Все продукты проиндексированы в MeiliSearch');
    } catch (error) {
        console.error('Ошибка при индексации продуктов:', error);
    }
}

indexProducts();
