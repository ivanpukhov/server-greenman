import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../../images/logo.svg';
import {
    IconBrandWhatsapp,
    IconBrandInstagram,
    IconPhone,
    IconClock,
    IconMapPin,
    IconArrowNarrowRight,
} from '../../icons';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';
import s from './Footer.module.scss';

const WA = 'https://wa.me/77770978675';
const IG = 'https://www.instagram.com/greenman_kazakstan/';
const PHONE = '+7 777 097 8675';
const PHONE_TEL = 'tel:+77770978675';

const Footer = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const year = new Date().getFullYear();

    if (location.pathname === '/auth') return null;

    return (
        <footer className={s.footer}>
            <div className={s.inner}>
                <div className={s.grid}>
                    <div className={s.brandCol}>
                        <Link to="/" className={s.brand} aria-label={t('common.brand')}>
                            <img src={logo} alt="" />
                            <span>{t('common.brand')}</span>
                        </Link>
                        <p className={s.brandText}>{t('footer.description')}</p>
                        <div className={s.social}>
                            <a
                                className={s.socialBtn}
                                href={WA}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="WhatsApp"
                            >
                                <IconBrandWhatsapp size={18} stroke={1.7} />
                            </a>
                            <a
                                className={s.socialBtn}
                                href={IG}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Instagram"
                            >
                                <IconBrandInstagram size={18} stroke={1.7} />
                            </a>
                        </div>
                    </div>

                    <div className={s.col}>
                        <h3 className={s.colTitle}>{t('footer.nav_title')}</h3>
                        <Link to="/" className={s.link}>
                            <span>{t('header.nav.home')}</span>
                        </Link>
                        <Link to="/catalog" className={s.link}>
                            <span>{t('header.nav.catalog')}</span>
                        </Link>
                        <Link to="/cart" className={s.link}>
                            <span>{t('header.nav.cart')}</span>
                        </Link>
                        <Link to="/profile" className={s.link}>
                            <span>{t('header.nav.profile')}</span>
                        </Link>
                    </div>

                    <div className={s.col}>
                        <h3 className={s.colTitle}>{t('footer.buyer_title')}</h3>
                        <Link to="/#delivery" className={s.link}>
                            <span>{t('footer.links.delivery')}</span>
                        </Link>
                        <Link to="/#faq" className={s.link}>
                            <span>{t('footer.links.faq')}</span>
                        </Link>
                        <Link to="/#about" className={s.link}>
                            <span>{t('footer.links.about')}</span>
                        </Link>
                        <a
                            href={WA}
                            target="_blank"
                            rel="noreferrer"
                            className={s.link}
                        >
                            <span>{t('footer.links.consultation')}</span>
                            <IconArrowNarrowRight size={16} stroke={1.7} />
                        </a>
                    </div>

                    <div className={s.col}>
                        <h3 className={s.colTitle}>{t('footer.contacts_title')}</h3>
                        <a href={PHONE_TEL} className={s.link}>
                            <IconPhone size={16} stroke={1.7} />
                            <span>{PHONE}</span>
                        </a>
                        <a
                            href={WA}
                            target="_blank"
                            rel="noreferrer"
                            className={s.link}
                        >
                            <IconBrandWhatsapp size={16} stroke={1.7} />
                            <span>WhatsApp</span>
                        </a>
                        <span className={s.contactText}>
                            <IconClock size={16} stroke={1.7} />
                            {t('footer.hours')}
                        </span>
                        <span className={s.contactText}>
                            <IconMapPin size={16} stroke={1.7} />
                            {t('footer.city')}
                        </span>
                    </div>
                </div>

                <div className={s.divider} />

                <div className={s.legalRow}>
                    <div className={s.legal}>
                        <span>{t('footer.copyright', { year })}</span>
                        <Link to="/#terms" className={s.legalLink}>
                            {t('footer.legal.terms')}
                        </Link>
                        <Link to="/#privacy" className={s.legalLink}>
                            {t('footer.legal.privacy')}
                        </Link>
                    </div>
                    <div className={s.languageWrap}>
                        <LanguageSwitcher compact />
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
