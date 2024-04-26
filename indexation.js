const meiliSearchClient = require('./utilities/meiliSearchClient');
const Product = require('./models/Product');
const ProductType = require('./models/ProductType');

async function indexProductsInMeiliSearch() {
    try {
        // Получение всех продуктов из базы данных
        const products = await Product.findAll({
            include: [{
                model: ProductType,
                as: 'types'
            }]
        });

        // Подготовка данных для индексации
        const documents = products.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description,
            applicationMethodChildren: product.applicationMethodChildren,
            applicationMethodAdults: product.applicationMethodAdults,
            diseases: product.diseases,
            contraindications: product.contraindications,
            videoUrl: product.videoUrl,
            types: product.types.map(type => ({ typeName: type.name, typeId: type.id }))
        }));

        // Индексация данных в MeiliSearch
        const index = meiliSearchClient.index('products');
        const response = await index.addDocuments(documents);
        console.log('Индексация завершена:', response);
    } catch (error) {
        console.error('Ошибка при индексации данных:', error);
    }
}

// Запуск индексации при старте приложения
module.exports = indexProductsInMeiliSearch;
