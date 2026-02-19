import './Main.scss'
import circe from '../../images/natural-circle.svg'
import about from '../../images/about.png'
import stories from '../../images/bottom_bar/stories.png'
import Faq from "../Faq/Faq";
import Banner from "../Banner/Banner.jsx";
import {Helmet} from 'react-helmet';
import SearchBlock from "../Catalog/SearchBlock";
import CatalogTop from "../Catalog/CatalogTop";
import {Link} from "react-router-dom";


const Main = () => {
    return (
        <>
            <Helmet>
                <title>Greenman - Лечебные настойки, соки сиропы лекарственных растений</title>
                <meta name="description"
                      content="Откройте для себя натуральные соки, настойки и экстракты из лечебных трав, корней, семян и плодов для поддержания вашего здоровья. Получите бесплатную консультацию для подбора продукции, идеально подходящей именно вам, основываясь на вашем диагнозе. Позаботьтесь о своем здоровье с нашими эксклюзивными продуктами"/>
                <meta name="keywords"
                      content="лечебные настойки, натуральные соки, сиропы лекарственных растений, экстракты трав, поддержание здоровья, натуральные продукты, лекарственные травы, консультации по здоровью, натуральная медицина, здоровье и благополучие, greenman "/>

                {/* Open Graph tags */}
                <meta property="og:title" content="Greenman - Лечебные настойки, соки и сиропы лекарственных растений"/>
                <meta property="og:description"
                      content="Откройте для себя натуральные соки, настойки и экстракты из лечебных трав, корней, семян и плодов для поддержания вашего здоровья. Получите бесплатную консультацию для подбора продукции, идеально подходящей именно вам, основываясь на вашем диагнозе. Позаботьтесь о своем здоровье с нашими эксклюзивными продуктами."/>
                <meta property="og:type" content="website"/>
                <meta property="og:url" content="https://greenman.kz/"/>
                {/* Замените ВАШ_САЙТ/путь_страницы на актуальный URL вашей страницы */}
                <meta property="og:image" content="https://greenman.kz/favicon.ico"/>
                {/* Укажите URL изображения, которое лучше всего описывает страницу */}
                <meta property="og:site_name" content="Greenman"/>
            </Helmet>

            <div className="banner">
                <div className="banner__natural">
                    <img src={circe} alt="natural products"/>
                </div>
                <div className="banner__title">
                    <h1>
                        GreenMan
                        <span>
                            Лечебные настойки, соки и сиропы лекарственных растений
                        </span>
                    </h1>

                </div>
                <SearchBlock/>
            </div>
            <div className="about">
                <div className="about__text">
                    <h2 className="about__title">Чем мы занимаемся</h2>
                    <p className="about__desc">
                        Мы занимаемся изготовлением соков, настоек, экстрактов из лечебных трав, корней, семян и плодов,
                        а также предлагаем бесплатную консультацию по подбору своей продукции по диагнозам клиентов
                    </p>
                </div>
                <div className="about__photo">
                    <img src={about} alt="green flowers"/>
                </div>
            </div>
            <a href='https://www.instagram.com/greenman_kazakstan/' className="stories">
                <div className="stories__images">
                    <div className="img__first">
                        <div className="img__pros">
                            <img src={stories} alt="stories"/>
                        </div>
                    </div>
                    <div className="img__second">
                        <div className="img__pros">
                            <img src={stories} alt="stories"/>
                        </div>
                    </div>
                </div>

                <div className="stories__text">
                    9+ новостей
                </div>
            </a>
            <h3 className="title__top"><span>Топ</span> товары</h3>
            <h4 className="subtitle__top">Часто покупаемые товары</h4>
            <CatalogTop/>
            <Link to={'/catalog'} className="main__catalog-link">
                Смотреть все товары
            </Link>
            <Faq/>
            <Banner/>
        </>)
}

export default Main
