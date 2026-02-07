import {
    ArrayField,
    Datagrid,
    DateField,
    Edit,
    List,
    NumberField,
    NumberInput,
    SelectInput,
    Show,
    ShowButton,
    SimpleForm,
    SimpleList,
    SimpleShowLayout,
    TextField,
    TextInput
} from 'react-admin';
import { useMediaQuery } from '@mui/material';

const orderStatusChoices = [
    { id: 'в обработке', name: 'В обработке' },
    { id: 'Оплачено', name: 'Оплачено' },
    { id: 'Отправлено', name: 'Отправлено' },
    { id: 'Доставлено', name: 'Доставлено' },
    { id: 'Отменено', name: 'Отменено' }
];

const orderPeriodChoices = [
    { id: 'today', name: 'Сегодня' },
    { id: 'yesterday', name: 'Вчера' },
    { id: 'week', name: 'Неделя' },
    { id: 'month', name: 'Месяц' }
];

export const OrderList = () => {
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('sm'));

    return (
        <List
            perPage={10}
            sort={{ field: 'id', order: 'DESC' }}
            filters={[
                <SelectInput
                    key="period"
                    source="period"
                    label="Период"
                    choices={orderPeriodChoices}
                    alwaysOn
                    emptyText="Все"
                />
            ]}
        >
            {isSmall ? (
                <SimpleList
                    primaryText={(record) => `Заказ #${record.id}`}
                    secondaryText={(record) => `${record.customerName} • ${record.totalPrice} ₸`}
                    tertiaryText={(record) => record.status}
                    linkType="show"
                />
            ) : (
                <Datagrid rowClick="show" bulkActionButtons={false}>
                    <TextField source="id" label="ID" />
                    <TextField source="customerName" label="Клиент" />
                    <TextField source="phoneNumber" label="Телефон" />
                    <TextField source="city" label="Город" />
                    <NumberField source="totalPrice" label="Сумма" />
                    <TextField source="paymentMethod" label="Оплата" />
                    <TextField source="deliveryMethod" label="Доставка" />
                    <TextField source="status" label="Статус" />
                    <DateField source="createdAt" label="Дата" showTime locales="ru-RU" />
                    <ShowButton label="Детали" />
                </Datagrid>
            )}
        </List>
    );
};

export const OrderShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" label="ID" />
            <TextField source="customerName" label="Клиент" />
            <TextField source="phoneNumber" label="Телефон" />
            <TextField source="kaspiNumber" label="Kaspi" />
            <TextField source="city" label="Город" />
            <TextField source="street" label="Улица" />
            <TextField source="houseNumber" label="Дом" />
            <TextField source="addressIndex" label="Индекс" />
            <TextField source="deliveryMethod" label="Способ доставки" />
            <TextField source="paymentMethod" label="Способ оплаты" />
            <TextField source="status" label="Статус" />
            <TextField source="trackingNumber" label="Трек-номер" />
            <NumberField source="totalPrice" label="Сумма" />
            <DateField source="createdAt" label="Создан" showTime locales="ru-RU" />

            <ArrayField source="products" label="Товары">
                <Datagrid bulkActionButtons={false}>
                    <TextField source="productId" label="ID товара" />
                    <TextField source="productName" label="Название" />
                    <TextField source="typeId" label="ID типа" />
                    <TextField source="typeName" label="Тип" />
                    <NumberField source="quantity" label="Кол-во" />
                </Datagrid>
            </ArrayField>
        </SimpleShowLayout>
    </Show>
);

export const OrderEdit = () => (
    <Edit mutationMode="pessimistic">
        <SimpleForm>
            <TextInput source="customerName" label="Клиент" fullWidth />
            <TextInput source="phoneNumber" label="Телефон" fullWidth />
            <TextInput source="city" label="Город" fullWidth />
            <TextInput source="street" label="Улица" fullWidth />
            <TextInput source="houseNumber" label="Дом" fullWidth />
            <TextInput source="addressIndex" label="Индекс" fullWidth />
            <TextInput source="deliveryMethod" label="Способ доставки" fullWidth />
            <TextInput source="paymentMethod" label="Способ оплаты" fullWidth />
            <SelectInput source="status" label="Статус" choices={orderStatusChoices} fullWidth />
            <TextInput source="trackingNumber" label="Трек-номер" fullWidth />
            <TextInput source="kaspiNumber" label="Kaspi номер" fullWidth />
            <NumberInput source="totalPrice" label="Сумма" min={0} fullWidth />
        </SimpleForm>
    </Edit>
);
