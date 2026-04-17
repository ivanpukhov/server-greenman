import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import SearchBlock from '../Catalog/SearchBlock';
import { Button, PageContainer } from '../../ui';
import {
    IconHome,
    IconShoppingBag,
    IconBrandWhatsapp,
} from '../../icons';
import s from './NotFound.module.scss';

const NotFound = () => {
    const { t } = useTranslation();

    return (
        <PageContainer size="lg" className={s.page}>
            <Helmet>
                <title>404 — GreenMan</title>
            </Helmet>

            <div className={s.card}>
                <div className={s.hero}>
                    <div className={s.badgeWrap}>
                        <div className={s.badge}>404</div>
                        <div className={s.badgeShadow}>404</div>
                    </div>
                    <div className={s.copy}>
                        <h1 className={s.title}>{t('not_found.title')}</h1>
                        <p className={s.lead}>{t('not_found.lead')}</p>
                    </div>
                </div>

                <div className={s.searchPanel}>
                    <div className={s.searchLabel}>Попробуйте найти нужный товар</div>
                    <div className={s.searchBox}>
                        <SearchBlock />
                    </div>
                </div>

                <div className={s.actions}>
                    <Button
                        component={Link}
                        to="/"
                        color="greenman"
                        radius="xl"
                        size="md"
                        leftSection={<IconHome size={16} stroke={1.8} />}
                    >
                        {t('common.home')}
                    </Button>
                    <Button
                        component={Link}
                        to="/catalog"
                        variant="light"
                        color="greenman"
                        radius="xl"
                        size="md"
                        leftSection={<IconShoppingBag size={16} stroke={1.8} />}
                    >
                        {t('common.catalog')}
                    </Button>
                    <Button
                        component="a"
                        href="https://wa.me/77087771999"
                        target="_blank"
                        rel="noopener"
                        variant="subtle"
                        radius="xl"
                        size="md"
                        leftSection={
                            <IconBrandWhatsapp size={16} stroke={1.8} />
                        }
                    >
                        {t('not_found.whatsapp')}
                    </Button>
                </div>

                <div className={s.footerNote}>
                    Если страница устарела, начните с каталога или напишите нам в WhatsApp.
                </div>
            </div>
        </PageContainer>
    );
};

export default NotFound;
