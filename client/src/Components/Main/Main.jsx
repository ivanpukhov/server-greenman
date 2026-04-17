import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    IconLeaf,
    IconTruck,
    IconHeart,
    IconShieldCheck,
    IconArrowRight,
    IconBrandWhatsapp,
    IconSearch,
    IconMessageCircle,
    IconPackage,
    IconStarFilled,
} from '../../icons';
import Faq from '../Faq/Faq';
import Banner from '../Banner/Banner.jsx';
import CatalogTop from '../Catalog/CatalogTop';
import SearchBlock from '../Catalog/SearchBlock';
import { Button, Section, PlaceholderImage } from '../../ui';
import PageContainer from '../../ui/PageContainer';
import aboutIllustration from '../../images/illustrations/about-leaves.svg';
import s from './Main.module.scss';

const WA = 'https://wa.me/77770978675';

const TRUST = [
    { icon: IconLeaf, key: 'natural' },
    { icon: IconTruck, key: 'delivery' },
    { icon: IconHeart, key: 'consult' },
    { icon: IconShieldCheck, key: 'quality' },
];

const STEP_ICONS = [IconSearch, IconMessageCircle, IconPackage];

const HERO_TILES = [
    { name: 'Эхинацея' },
    { name: 'Облепиха' },
    { name: 'Календула' },
    { name: 'Зверобой' },
];

const Main = () => {
    const { t } = useTranslation();
    const steps = t('main.how_it_works.steps', { returnObjects: true }) || [];

    return (
        <>
            <Helmet>
                <title>{t('main.seo_title')}</title>
                <meta name="description" content={t('main.seo_description')} />
                <meta property="og:title" content={t('main.seo_title')} />
                <meta property="og:description" content={t('main.seo_description')} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://greenman.kz/" />
            </Helmet>

            {/* ───────────────────────── HERO ───────────────────────── */}
            <section className={s.heroWrap}>
                <div className={s.heroBg} aria-hidden="true">
                    <div className={s.heroBlob1} />
                    <div className={s.heroBlob2} />
                    <div className={s.heroGrain} />
                </div>

                <PageContainer>
                    <div className={s.hero}>
                        <div className={s.heroText}>
                            <span className={s.eyebrow}>
                                <span className={s.eyebrowDot} />
                                {t('main.hero.eyebrow')}
                            </span>

                            <h1 className={s.heroTitle}>{t('main.hero.title')}</h1>

                            <p className={s.heroSubtitle}>{t('main.hero.subtitle')}</p>

                            <div className={s.heroCtas}>
                                <Button
                                    component={Link}
                                    to="/catalog"
                                    size="lg"
                                    rightSection={<IconArrowRight size={18} stroke={2} />}
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
                                    leftSection={<IconBrandWhatsapp size={18} stroke={2} />}
                                >
                                    {t('main.hero.cta_consult')}
                                </Button>
                            </div>

                            <dl className={s.stats}>
                                <div className={s.stat}>
                                    <dt>{t('main.hero.stats.years.value')}</dt>
                                    <dd>{t('main.hero.stats.years.label')}</dd>
                                </div>
                                <div className={s.stat}>
                                    <dt>{t('main.hero.stats.orders.value')}</dt>
                                    <dd>{t('main.hero.stats.orders.label')}</dd>
                                </div>
                                <div className={s.stat}>
                                    <dt>
                                        <span className={s.ratingVal}>
                                            {t('main.hero.stats.rating.value')}
                                        </span>
                                        <IconStarFilled size={16} />
                                    </dt>
                                    <dd>{t('main.hero.stats.rating.label')}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className={s.heroArt} aria-hidden="true">
                            <div className={s.tileGrid}>
                                {HERO_TILES.map((tile, i) => (
                                    <div
                                        key={tile.name}
                                        className={`${s.tile} ${s[`tile${i + 1}`]}`}
                                    >
                                        <PlaceholderImage
                                            name={tile.name}
                                            rounded="xl"
                                            size="lg"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </PageContainer>
            </section>

            {/* ───────────────────── SEARCH (floating over hero bottom) ───────────────────── */}
            <PageContainer>
                <div className={s.searchCard}>
                    <div className={s.searchCardHead}>
                        <h2 className={s.searchCardTitle}>
                            {t('main.search_block.title')}
                        </h2>
                        <p className={s.searchCardSub}>
                            {t('main.search_block.subtitle')}
                        </p>
                    </div>
                    <SearchBlock />
                </div>
            </PageContainer>

            {/* ───────────────────────── HOW IT WORKS ───────────────────────── */}
            <Section
                eyebrow={t('main.how_it_works.eyebrow')}
                title={t('main.how_it_works.title')}
                subtitle={t('main.how_it_works.subtitle')}
                align="center"
                spacing="md"
            >
                <ol className={s.stepsGrid}>
                    {steps.map((step, i) => {
                        const Icon = STEP_ICONS[i] || IconLeaf;
                        return (
                            <li key={step.n} className={s.stepCard}>
                                <div className={s.stepHead}>
                                    <span className={s.stepNum}>{step.n}</span>
                                    <span className={s.stepIcon}>
                                        <Icon size={22} stroke={1.8} />
                                    </span>
                                </div>
                                <h3 className={s.stepTitle}>{step.title}</h3>
                                <p className={s.stepText}>{step.text}</p>
                            </li>
                        );
                    })}
                </ol>
            </Section>

            {/* ───────────────────────── TRUST ───────────────────────── */}
            <Section
                eyebrow={t('main.trust_section.eyebrow')}
                title={t('main.trust_section.title')}
                subtitle={t('main.trust_section.subtitle')}
                tone="sunken"
                spacing="md"
            >
                <div className={s.trustGrid}>
                    {TRUST.map(({ icon: Icon, key }) => (
                        <article key={key} className={s.trustCard}>
                            <span className={s.trustIcon}>
                                <Icon size={22} stroke={1.8} />
                            </span>
                            <h3 className={s.trustTitle}>{t(`main.trust.${key}.title`)}</h3>
                            <p className={s.trustText}>{t(`main.trust.${key}.text`)}</p>
                        </article>
                    ))}
                </div>
            </Section>

            {/* ───────────────────────── TOP PRODUCTS ───────────────────────── */}
            <Section
                eyebrow={t('main.top.subtitle')}
                title={t('main.top.title')}
                trailing={
                    <Button
                        component={Link}
                        to="/catalog"
                        variant="subtle"
                        rightSection={<IconArrowRight size={16} stroke={2} />}
                    >
                        {t('main.top.see_all')}
                    </Button>
                }
                spacing="md"
            >
                <CatalogTop limit={8} />

                <div className={s.seeAllCard}>
                    <div>
                        <div className={s.seeAllTitle}>{t('main.top.more_hint')}</div>
                        <div className={s.seeAllText}>{t('catalog.subtitle')}</div>
                    </div>
                    <Button
                        component={Link}
                        to="/catalog"
                        rightSection={<IconArrowRight size={16} stroke={2} />}
                    >
                        {t('main.top.see_all_cta')}
                    </Button>
                </div>
            </Section>

            {/* ───────────────────────── ABOUT ───────────────────────── */}
            <Section spacing="md">
                <div className={s.about}>
                    <div className={s.aboutText}>
                        <span className={s.eyebrow}>
                            <span className={s.eyebrowDot} />
                            {t('main.about.eyebrow')}
                        </span>
                        <h2 className={s.aboutTitle}>{t('main.about.title')}</h2>
                        <p className={s.aboutLead}>{t('main.about.text')}</p>
                        <Button
                            component="a"
                            href={WA}
                            target="_blank"
                            rel="noreferrer"
                            variant="light"
                            leftSection={<IconBrandWhatsapp size={18} stroke={2} />}
                            mt="md"
                        >
                            {t('main.hero.cta_consult')}
                        </Button>
                    </div>
                    <div className={s.aboutArt}>
                        <img src={aboutIllustration} alt="" loading="lazy" />
                    </div>
                </div>
            </Section>

            {/* ───────────────────────── FAQ ───────────────────────── */}
            <PageContainer>
                <Faq />
            </PageContainer>

            {/* ───────────────────────── CTA BANNER ───────────────────────── */}
            <PageContainer>
                <Banner />
            </PageContainer>
        </>
    );
};

export default Main;
