import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Box, Button, Container, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import {
    IconLeaf,
    IconTruck,
    IconHeart,
    IconShieldCheck,
    IconArrowRight,
    IconBrandWhatsapp,
} from '../../icons';
import Faq from '../Faq/Faq';
import Banner from '../Banner/Banner.jsx';
import CatalogTop from '../Catalog/CatalogTop';
import SearchBlock from '../Catalog/SearchBlock';
import heroIllustration from '../../images/illustrations/hero.svg';
import aboutIllustration from '../../images/illustrations/about-leaves.svg';
import s from './Main.module.scss';

const WA = 'https://wa.me/77770978675';

const TRUST = [
    { icon: IconLeaf, key: 'natural' },
    { icon: IconTruck, key: 'delivery' },
    { icon: IconHeart, key: 'consult' },
    { icon: IconShieldCheck, key: 'quality' },
];

const Main = () => {
    const { t } = useTranslation();

    return (
        <>
            <Helmet>
                <title>{t('main.seo_title')}</title>
                <meta name="description" content={t('main.seo_description')} />
                <meta property="og:title" content={t('main.seo_title')} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://greenman.kz/" />
            </Helmet>

            <Container size="xl" px="md" mt="md" className={s.heroWrap}>
                <div className={s.hero}>
                    <div className={s.heroDecor} aria-hidden="true" />
                    <Stack gap="md" className={s.heroText} maw={560}>
                        <Text size="sm" fw={600} c="greenman" tt="uppercase" lts={0.8}>
                            {t('main.hero.eyebrow')}
                        </Text>
                        <Title order={1} className={s.heroTitle}>
                            {t('main.hero.title')}
                        </Title>
                        <Text size="lg" c="dimmed" lh={1.5} maw={520}>
                            {t('main.hero.subtitle')}
                        </Text>
                        <Group gap="sm" mt="sm">
                            <Button
                                component={Link}
                                to="/catalog"
                                size="lg"
                                color="greenman"
                                rightSection={<IconArrowRight size={18} stroke={1.8} />}
                            >
                                {t('main.hero.cta_catalog')}
                            </Button>
                            <Button
                                component="a"
                                href={WA}
                                target="_blank"
                                rel="noreferrer"
                                size="lg"
                                variant="default"
                                leftSection={<IconBrandWhatsapp size={18} stroke={1.8} />}
                            >
                                {t('main.hero.cta_consult')}
                            </Button>
                        </Group>
                    </Stack>
                    <div className={s.heroArt}>
                        <img src={heroIllustration} alt="" />
                    </div>
                </div>
            </Container>

            <Container size="xl" px="md" mt={48}>
                <Box className={s.searchCard}>
                    <Stack gap={6} mb="md" align="center">
                        <Title order={3} ta="center" style={{ letterSpacing: '-0.02em' }}>
                            {t('main.search_block.title')}
                        </Title>
                        <Text size="sm" c="dimmed" ta="center">
                            {t('main.search_block.subtitle')}
                        </Text>
                    </Stack>
                    <SearchBlock />
                </Box>
            </Container>

            <Container size="xl" px="md" mt={64}>
                <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing="md">
                    {TRUST.map(({ icon: Icon, key }) => (
                        <div key={key} className={s.trustCard}>
                            <span className={s.trustIcon}>
                                <Icon size={22} stroke={1.7} />
                            </span>
                            <Text fw={700} size="sm" mt="sm">
                                {t(`main.trust.${key}.title`)}
                            </Text>
                            <Text size="xs" c="dimmed" mt={4} lh={1.45}>
                                {t(`main.trust.${key}.text`)}
                            </Text>
                        </div>
                    ))}
                </SimpleGrid>
            </Container>

            <Container size="xl" px="md" mt={72}>
                <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap">
                    <Stack gap={2}>
                        <Text size="sm" fw={600} c="greenman" tt="uppercase" lts={0.8}>
                            {t('main.top.subtitle')}
                        </Text>
                        <Title order={2} style={{ letterSpacing: '-0.02em' }}>
                            {t('main.top.title')}
                        </Title>
                    </Stack>
                    <Button
                        component={Link}
                        to="/catalog"
                        variant="subtle"
                        color="greenman"
                        rightSection={<IconArrowRight size={16} stroke={1.8} />}
                    >
                        {t('main.top.see_all')}
                    </Button>
                </Group>
                <CatalogTop limit={8} />

                <Box className={s.seeAllCard} mt="lg">
                    <Stack gap={4}>
                        <Text fw={700} size="md">{t('main.top.more_hint')}</Text>
                        <Text size="sm" c="dimmed">{t('catalog.subtitle')}</Text>
                    </Stack>
                    <Button
                        component={Link}
                        to="/catalog"
                        color="greenman"
                        radius="xl"
                        rightSection={<IconArrowRight size={16} stroke={1.8} />}
                    >
                        {t('main.top.see_all_cta')}
                    </Button>
                </Box>
            </Container>

            <Container size="xl" px="md" mt={72}>
                <div className={s.about}>
                    <Stack gap="md" className={s.aboutText}>
                        <Text size="sm" fw={600} c="greenman" tt="uppercase" lts={0.8}>
                            {t('main.about.eyebrow')}
                        </Text>
                        <Title order={2} style={{ letterSpacing: '-0.02em' }}>
                            {t('main.about.title')}
                        </Title>
                        <Text c="dimmed" size="md" lh={1.6}>
                            {t('main.about.text')}
                        </Text>
                    </Stack>
                    <div className={s.aboutArt}>
                        <img src={aboutIllustration} alt="" />
                    </div>
                </div>
            </Container>

            <Container size="xl" px="md">
                <Faq />
            </Container>

            <Container size="xl" px="md">
                <Banner />
            </Container>
        </>
    );
};

export default Main;
