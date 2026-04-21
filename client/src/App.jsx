import React from 'react';
import {BrowserRouter as Router, Link, Route, Routes, useLocation} from 'react-router-dom';
import Header from "./Components/Header/Header";
import Main from "./Components/Main/Main";
import BottomBar from "./Components/BottomBar/BottomBar";
import Footer from "./Components/Footer/Footer";
import Cart from "./Components/Cart/Cart";
import Auth from './Components/Auth/Auth.jsx';
import Profile from './Components/Profile/Profile';
import './App.scss';
import ProductInfo from "./Components/Catalog/ProductDetails";
import Catalog from "./Components/Catalog/Catalog";
import ScrollToTop from "./Components/ScrollToTop";
import Search from "./Components/Catalog/Search";
import AdminApp from "./admin/AdminApp";
import CountryModal from "./Components/CountrySelect/CountryModal";
import Feed from "./Components/social/Feed";
import ReelsFeed from "./Components/social/ReelsFeed";
import ArticleList from "./Components/social/ArticleList";
import ArticlePage from "./Components/social/ArticlePage";
import WebinarPage from "./Components/social/WebinarPage";
import CoursesList from "./Components/social/CoursesList";
import CoursePage from "./Components/social/CoursePage";
import CourseDayView from "./Components/social/CourseDayView";
import MyCourses from "./Components/social/MyCourses";

function App() {
    return (
        <div className="App">
            <Router>
                <AppRoutes />
            </Router>
        </div>
    );
}

function AppRoutes() {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');

    const checkPath = (path) => path.startsWith('/AP');
    const redirectToExternalSite = (path) => {
        document.location.href = `https://track.greenman.kz${path}`;
        return null;
    };

    return (
        <>
            {!isAdminRoute && <ScrollToTop />}
            {!isAdminRoute && <Header/>}
            <div className={isAdminRoute ? '' : 'container'}>
                <Routes>
                    <Route path="/admin/*" element={<AdminApp />} />
                    <Route path="/" element={<Main/>}/>
                    <Route path="/cart" element={<Cart/>}/>
                    <Route path="/catalog" element={<Catalog/>}/>
                    <Route path="/product/:id" element={<ProductInfo/>}/>
                    <Route path="/search/:type/:query" element={<Search/>}/>
                    <Route path="/auth" element={<Auth/>}/>
                    <Route path="/profile" element={<Profile/>}/>
                    <Route path="/feed" element={<Feed/>}/>
                    <Route path="/reels" element={<ReelsFeed/>}/>
                    <Route path="/articles" element={<ArticleList/>}/>
                    <Route path="/articles/:slug" element={<ArticlePage/>}/>
                    <Route path="/webinars/:slug" element={<WebinarPage/>}/>
                    <Route path="/courses" element={<CoursesList/>}/>
                    <Route path="/courses/:slug" element={<CoursePage/>}/>
                    <Route path="/courses/:slug/day/:dayNumber" element={<CourseDayView/>}/>
                    <Route path="/my-courses" element={<MyCourses/>}/>
                    <Route
                        path="/*"
                        element={
                            checkPath(location.pathname)
                                ? redirectToExternalSite(location.pathname)
                                : <NotFoundPage/>
                        }
                    />
                </Routes>
            </div>
            {!isAdminRoute && <Footer/>}
            {!isAdminRoute && <BottomBar/>}
            {!isAdminRoute && <CountryModal/>}
        </>
    );
}

// Компонент для отображения страницы 404: Страница не найдена
function NotFoundPage() {
    return (
        <div className="cart__n">
            <div className="cart__null">
                <div className="cart__null-title">
                    Ошибка 404. Страница не найдена!
                </div>
                <div className="cart__null-text">
                    Выберите товар в каталоге, либо введите название товара или болезни в поиске, и выберите то, что
                    поможет именно Вам!
                </div>
                <Link to={'/'} className="cart__null--btn">На главную</Link>
                <Link to={'/catalog'} className="cart__null--btn">Перейти в каталог</Link>
            </div>
        </div>
    );
}

export default App;
