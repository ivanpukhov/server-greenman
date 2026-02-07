const express = require('express');
const path = require('path');
const expressSitemapXml = require('express-sitemap-xml');
const compression = require('compression');

const app = express();

// Предопределенный список URL для карты сайта
const getUrls = async () => {
  return [
    '/',
    '/cart',
    '/catalog',
    '/auth',
    '/profile',
    '/product/1',
    '/product/2',
    '/product/3',
    '/product/4',
    '/product/5',
    '/product/6',
    '/product/7',
    '/product/8',
    '/product/9',
    '/product/10',
    '/product/11',
    '/product/12',
    '/product/13',
    '/product/14',
    '/product/15',
    '/product/16',
    '/product/17',
    '/product/18',
    '/product/19',
    '/product/20',
    '/product/21',
    '/product/22',
    '/product/23',
    '/product/24',
    '/product/26',
    '/product/27',
    '/product/32',
    '/product/33',
    '/product/34',
    '/product/35',
    '/product/36',
    '/product/37',
    '/product/38',
  ];
};

// Middleware для сжатия HTTP ответов
app.use(compression());

// Middleware для генерации Sitemap.xml
app.use(expressSitemapXml(getUrls, 'https://greenman.kz'));

// Обслуживание статических файлов
app.use(express.static(path.join(__dirname, 'build'), {
  etag: true, // Включение ETag для кэширования
  lastModified: true, // Включение заголовка Last-Modified
  setHeaders: (res, path) => {
    if (express.static.mime.lookup(path) === 'text/html') {
      res.setHeader('Cache-Control', 'public, max-age=0'); // Исключение HTML из кэширования
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Кэширование остальных статических ресурсов на год
    }
  }
}));

// Обслуживание файла robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'build', 'robots.txt'));
});

// Перенаправление всех запросов на index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
