function buildTelegramOrderMessage(order) {
    return `Новый заказ:\nID: ${order.id}\nНомер: ${order.kaspiNumber}\nКомментарий: ${order.phoneNumber}\nЦена: ${order.totalPrice}\nИмя клиента: ${order.customerName}\nИндекс: ${order.addressIndex}\nГород: ${order.city}\nУлица: ${order.street}\nДом: ${order.houseNumber}\nСпособ доставки: ${order.deliveryMethod}\nСпособ оплаты: ${order.paymentMethod}`;
}

module.exports = buildTelegramOrderMessage;
