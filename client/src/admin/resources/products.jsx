import {
    ArrayField,
    ArrayInput,
    Create,
    Datagrid,
    DeleteButton,
    Edit,
    EditButton,
    FunctionField,
    List,
    NumberField,
    NumberInput,
    required,
    SearchInput,
    Show,
    ShowButton,
    SimpleForm,
    SimpleFormIterator,
    SimpleList,
    SimpleShowLayout,
    TextField,
    TextInput
} from 'react-admin';
import { useMediaQuery } from '@mui/material';

const productFilters = [<SearchInput source="q" alwaysOn key="search" />];

const transformProduct = (data) => {
    const diseases = Array.isArray(data.diseases)
        ? data.diseases
        : String(data.diseases || '')
              .split(/\n|,|;/)
              .map((item) => item.trim())
              .filter(Boolean);

    return {
        ...data,
        diseases,
        types: Array.isArray(data.types)
            ? data.types.map((typeItem) => ({
                  type: typeItem.type,
                  price: Number(typeItem.price) || 0
              }))
            : []
    };
};

export const ProductList = () => {
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('sm'));

    return (
        <List filters={productFilters} perPage={10} sort={{ field: 'id', order: 'DESC' }}>
            {isSmall ? (
                <SimpleList
                    primaryText={(record) => record.name}
                    secondaryText={(record) => `${record.types?.length || 0} типов`}
                    tertiaryText={(record) => `ID: ${record.id}`}
                    linkType="show"
                />
            ) : (
                <Datagrid rowClick="show" bulkActionButtons={false}>
                    <TextField source="id" label="ID" />
                    <TextField source="name" label="Название" />
                    <FunctionField label="Кол-во типов" render={(record) => record.types?.length || 0} />
                    <TextField source="videoUrl" label="Видео URL" />
                    <EditButton label="Изменить" />
                    <ShowButton label="Детали" />
                    <DeleteButton label="Удалить" mutationMode="pessimistic" />
                </Datagrid>
            )}
        </List>
    );
};

const ProductFormFields = () => (
    <>
        <TextInput source="name" label="Название" fullWidth validate={required()} />
        <TextInput source="description" label="Описание" fullWidth multiline minRows={4} />
        <TextInput
            source="applicationMethodChildren"
            label="Способ применения (дети)"
            fullWidth
            multiline
            minRows={3}
        />
        <TextInput
            source="applicationMethodAdults"
            label="Способ применения (взрослые)"
            fullWidth
            multiline
            minRows={3}
        />
        <TextInput
            source="diseases"
            label="Заболевания (через запятую или новую строку)"
            fullWidth
            multiline
            minRows={3}
            parse={(value) =>
                String(value || '')
                    .split(/\n|,|;/)
                    .map((item) => item.trim())
                    .filter(Boolean)
            }
            format={(value) => (Array.isArray(value) ? value.join(', ') : value || '')}
            validate={required()}
        />
        <TextInput source="contraindications" label="Противопоказания" fullWidth multiline minRows={3} validate={required()} />
        <TextInput source="videoUrl" label="Ссылка на видео" fullWidth />

        <ArrayInput source="types" label="Варианты товара" validate={required()}>
            <SimpleFormIterator inline>
                <TextInput source="type" label="Тип" validate={required()} />
                <NumberInput source="price" label="Цена" validate={required()} min={0} />
            </SimpleFormIterator>
        </ArrayInput>
    </>
);

export const ProductCreate = () => (
    <Create mutationMode="pessimistic" transform={transformProduct} redirect="list">
        <SimpleForm>
            <ProductFormFields />
        </SimpleForm>
    </Create>
);

export const ProductEdit = () => (
    <Edit mutationMode="pessimistic" transform={transformProduct}>
        <SimpleForm>
            <ProductFormFields />
        </SimpleForm>
    </Edit>
);

export const ProductShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" label="ID" />
            <TextField source="name" label="Название" />
            <TextField source="description" label="Описание" />
            <TextField source="applicationMethodChildren" label="Применение (дети)" />
            <TextField source="applicationMethodAdults" label="Применение (взрослые)" />
            <TextField source="contraindications" label="Противопоказания" />
            <TextField source="videoUrl" label="Видео URL" />
            <FunctionField
                label="Заболевания"
                render={(record) => (Array.isArray(record.diseases) ? record.diseases.join(', ') : '')}
            />
            <ArrayField source="types" label="Типы">
                <Datagrid bulkActionButtons={false}>
                    <TextField source="type" label="Тип" />
                    <NumberField source="price" label="Цена" />
                </Datagrid>
            </ArrayField>
        </SimpleShowLayout>
    </Show>
);
