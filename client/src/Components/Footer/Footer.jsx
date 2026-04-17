import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Anchor, Group, Text } from '@mantine/core';
import logo from '../../images/logo.svg';

const Footer = () => {
    const location = useLocation();
    if (location.pathname === '/auth') return null;

    return (
        <footer className="footer">
            <Link to="/" className="logo">
                <img src={logo} alt="GreenMan" />
                <span>GreenMan</span>
            </Link>
            <Group className="footer__links" gap="lg">
                <Anchor href="https://wa.me/77770978675" target="_blank" rel="noreferrer" c="greenman">
                    WhatsApp
                </Anchor>
                <Anchor href="https://www.instagram.com/greenman_kazakstan/" target="_blank" rel="noreferrer" c="greenman">
                    Instagram
                </Anchor>
            </Group>
            <Text size="sm" c="dimmed" className="footer__copyright">
                © Работаем с 2018 года
            </Text>
        </footer>
    );
};

export default Footer;
