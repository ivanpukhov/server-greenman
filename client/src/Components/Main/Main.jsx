import { Anchor, Box, Container, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import circe from '../../images/natural-circle.svg';
import about from '../../images/about.png';
import stories from '../../images/bottom_bar/stories.png';
import Faq from '../Faq/Faq';
import Banner from '../Banner/Banner.jsx';
import SearchBlock from '../Catalog/SearchBlock';
import CatalogTop from '../Catalog/CatalogTop';

const Main = () => (
    <>
        <Helmet>
            <title>Greenman — Лечебные настойки, соки и сиропы лекарственных растений</title>
            <meta name="description" content="Натуральные соки, настойки и экстракты из лечебных трав, корней, семян и плодов. Бесплатная консультация по подбору продуктов по диагнозу." />
            <meta property="og:title" content="Greenman — Лечебные настойки, соки и сиропы" />
            <meta property="og:type" content="website" />
            <meta property="og:url" content="https://greenman.kz/" />
            <meta property="og:image" content="https://greenman.kz/favicon.ico" />
            <meta property="og:site_name" content="Greenman" />
        </Helmet>

        {/* Hero */}
        <Box
            style={{
                background: 'linear-gradient(135deg, #EDF4EF 0%, #E5EEE8 100%)',
                borderRadius: '0 0 28px 28px',
                padding: '32px 20px 40px',
                marginBottom: 32
            }}
        >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" style={{ alignItems: 'center' }}>
                <Stack gap="md">
                    <Title
                        order={1}
                        style={{ color: '#00AB6D', lineHeight: 1.15 }}
                        size="h1"
                    >
                        GreenMan
                        <Text component="span" display="block" size="lg" fw={400} c="dark.4" mt={4}>
                            Лечебные настойки, соки и сиропы лекарственных растений
                        </Text>
                    </Title>
                    <SearchBlock />
                </Stack>
                <Box ta="center">
                    <img src={circe} alt="natural products" style={{ maxWidth: 260, width: '100%' }} />
                </Box>
            </SimpleGrid>
        </Box>

        {/* About */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" style={{ alignItems: 'center', padding: '0 20px', marginBottom: 40 }}>
            <Stack gap="sm">
                <Title order={2} c="dark.7">Чем мы занимаемся</Title>
                <Text c="dimmed" size="sm" lh={1.7}>
                    Мы занимаемся изготовлением соков, настоек, экстрактов из лечебных трав, корней, семян и плодов, а также предлагаем бесплатную консультацию по подбору своей продукции по диагнозам клиентов.
                </Text>
            </Stack>
            <Box ta="center">
                <img src={about} alt="green flowers" style={{ maxWidth: 280, width: '100%', borderRadius: 16 }} />
            </Box>
        </SimpleGrid>

        {/* Instagram stories */}
        <Anchor
            href="https://www.instagram.com/greenman_kazakstan/"
            target="_blank"
            rel="noreferrer"
            className="stories"
            underline="never"
        >
            <div className="stories__images">
                <div className="img__first"><div className="img__pros"><img src={stories} alt="stories" /></div></div>
                <div className="img__second"><div className="img__pros"><img src={stories} alt="stories" /></div></div>
            </div>
            <div className="stories__text">9+ новостей</div>
        </Anchor>

        {/* Top products */}
        <Box px="md" mt="xl">
            <Title order={3} ta="center" mb={4}>
                <Text component="span" c="greenman">Топ</Text> товары
            </Title>
            <Text ta="center" c="dimmed" size="sm" mb="lg">Часто покупаемые товары</Text>
            <CatalogTop />
            <Box ta="center" mt="lg">
                <Link to="/catalog" className="main__catalog-link">Смотреть все товары</Link>
            </Box>
        </Box>

        <Box px="md">
            <Faq />
        </Box>

        <Box px="md" mt="xl">
            <Banner />
        </Box>
    </>
);

export default Main;
