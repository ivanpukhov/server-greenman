
# REST API Сайта Greenman

Это REST API для сайта Greenman, который обеспечивает возможности управления каталогом товаров, обработки заказов и поиска продуктов. Архитектура сервиса построена с использованием современных технологий и следует принципам REST.

## Функциональные возможности

- **Управление товарами:**
    - Добавление нового товара с детальным описанием.
    - Управление списком болезней и противопоказаний связанных с продуктами.
    - Добавление ссылок на видео, описывающих товар.
    - Управление ценами в зависимости от типа товара (на меду, на спирту, сироп).

- **Управление заказами:**
    - Создание заказов с автоматическим расчетом цены в зависимости от количества и типа товаров.
    - Управление данными заказчика и способами доставки.

- **Поиск продуктов:**
    - По названию товара.
    - По болезни, от которой помогает товар.

- **Дополнительные функции:**
    - Регистрация и аутентификация пользователей.
    - Отправка уведомлений пользователям.

## Технологический стек

- Node.js / Express.js - серверный JavaScript фреймворк.
- Sequelize ORM - ORM для удобной работы с базами данных.
- SQLite - легковесная СУБД, хранящая все данные в одном файле.
- bcrypt.js - библиотека для безопасного хэширования паролей.
- JWT (JSON Web Tokens) - технология для создания токенов аутентификации.
- Axios - библиотека для выполнения HTTP-запросов.

## Установка и настройка проекта

Клонирование репозитория:

```bash
git clone https://github.com/ivanpukhov/greenman-backend.git
```

Переход в каталог проекта:

```bash
cd greenman-server
```

Установка необходимых пакетов и зависимостей:

```bash
yarn install
```

Для настройки необходимых переменных среды переименуйте файл `.env.example` в `.env` и заполните его своими данными.

Запуск приложения:

```bash
yarn start
```
```bash
docker run -it --rm -p 7700:7700 -v $(pwd)/data.ms:/data.ms getmeili/meilisearch
```

## Примеры использования

Документация по API и примеры запросов будут предоставлены после запуска приложения через интерфейс Swagger или Postman коллекции, доступной по следующему адресу: `http://localhost:3000/docs`.

## Тестирование

Описание того, как запустить тесты для проекта:

```bash
yarn test
```

## Как внести вклад

Если вы хотите помочь улучшить проект, вы можете создать `fork` репозитория, внести свои изменения и отправить `pull request`. Подробная процедура внесения изменений будет описана в документации проекта.

## Лицензия

Данный проект распространяется под лицензией MIT, что позволяет использовать код в открытых и коммерческих проектах при условии указания авторства.

## Контакты


- Разработчик: Иван Пухов (ix@ivaninbox.site)


---

Спасибо за интерес к проекту REST API Сайта Greenman!
# server-greenman
# server-greenman
# server-greenman
