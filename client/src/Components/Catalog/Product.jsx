import React from 'react';
import { NavLink } from 'react-router-dom';
import { Badge, Card, Group, Text } from '@mantine/core';
import AddToCartControl from './AddToCartControl.jsx';

const truncate = (str, num = 79) => str.length > num ? str.slice(0, num) + '...' : str;

const Product = ({ product }) => (
    <Card
        shadow="sm"
        padding="md"
        radius="lg"
        withBorder
        className="product"
        style={{
            border: '1px solid rgba(0,171,109,0.15)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
        }}
    >
        <NavLink to={`/product/${product.id}`} className="product__text" style={{ textDecoration: 'none' }}>
            <Text fw={700} size="sm" c="dark.7" mb={4} className="product__name">{product.name}</Text>
            <Text size="xs" c="dimmed" lineClamp={2} className="product__desc">{truncate(product.description)}</Text>
            <Text size="xs" c="greenman" mt={6} fw={500}>Узнать подробнее →</Text>
        </NavLink>
        <AddToCartControl product={product} />
    </Card>
);

export default Product;
