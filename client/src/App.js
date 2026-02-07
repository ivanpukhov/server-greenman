import React from 'react';
import {BrowserRouter as Router, Link, Route, Routes} from 'react-router-dom';
import Header from "./Components/Header/Header";
import Main from "./Components/Main/Main";
import BottomBar from "./Components/BottomBar/BottomBar";
import Footer from "./Components/Footer/Footer";
import Cart from "./Components/Cart/Cart";
import Auth from './Components/Auth/Auth';
import Profile from './Components/Profile/Profile';
import './App.scss';
import {useAuth} from "./AuthContext";
import ProductInfo from "./Components/Catalog/ProductDetails";
import Catalog from "./Components/Catalog/Catalog";
import ScrollToTop from "./Components/ScrollToTop";
import Search from "./Components/Catalog/Search";

function App() {
    const {isAuthenticated} = useAuth();

    // Функция для проверки начала пути
    const checkPath = (path) => {
        return path.startsWith('/AP');
    };

    // Функция для перенаправления
    const redirectToExternalSite = (path) => {
        document.location.href = `https://track.greenman.kz${path}`;
    };

    return (
        <div className="App">
            <Router>
                <ScrollToTop/>
                <Header/>
                <div className="container">
                    <Routes>
                        <Route path="/" element={<Main/>}/>
                        <Route path="/cart" element={<Cart/>}/>
                        <Route path="/catalog" element={<Catalog/>}/>
                        <Route path="/product/:id" element={<ProductInfo/>}/>
                        <Route path="/search/:type/:query" element={<Search/>}/>

                        <Route path="/auth" element={<Auth/>}/>
                        <Route path="/profile" element={<Profile/>}/>

                        {/* Добавляем проверку для перенаправления */}
                        <Route
                            path="/*"
                            element={
                                checkPath(window.location.pathname) ? (
                                    redirectToExternalSite(window.location.pathname)
                                ) : <NotFoundPage/>
                            }
                        />
                    </Routes>
                </div>
                <Footer/>
                <BottomBar/>
            </Router>
        </div>
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
