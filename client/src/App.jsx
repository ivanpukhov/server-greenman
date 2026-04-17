import React, { Suspense, lazy } from 'react';
import {
    BrowserRouter as Router,
    Route,
    Routes,
    useLocation,
} from 'react-router-dom';
import { Loader, Center } from '@mantine/core';
import Header from './Components/Header/Header';
import BottomBar from './Components/BottomBar/BottomBar';
import Footer from './Components/Footer/Footer';
import ScrollToTop from './Components/ScrollToTop';
import CountryModal from './Components/CountrySelect/CountryModal';
import './App.scss';

const Main = lazy(() => import('./Components/Main/Main'));
const Cart = lazy(() => import('./Components/Cart/Cart'));
const Checkout = lazy(() => import('./Components/Checkout/Checkout'));
const Auth = lazy(() => import('./Components/Auth/Auth.jsx'));
const Profile = lazy(() => import('./Components/Profile/Profile'));
const ProductInfo = lazy(() => import('./Components/Catalog/ProductDetails'));
const Catalog = lazy(() => import('./Components/Catalog/Catalog'));
const Search = lazy(() => import('./Components/Catalog/Search'));
const AdminApp = lazy(() => import('./admin/AdminApp'));
const NotFound = lazy(() => import('./Components/NotFound/NotFound'));

const RouteFallback = () => (
    <Center style={{ minHeight: 320 }}>
        <Loader color="greenman" />
    </Center>
);

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
            {!isAdminRoute && <Header />}
            <div className={isAdminRoute ? '' : 'container'}>
                <Suspense fallback={<RouteFallback />}>
                    <Routes>
                        <Route path="/admin/*" element={<AdminApp />} />
                        <Route path="/" element={<Main />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/catalog" element={<Catalog />} />
                        <Route path="/product/:id" element={<ProductInfo />} />
                        <Route
                            path="/search/:type/:query"
                            element={<Search />}
                        />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route
                            path="/*"
                            element={
                                checkPath(location.pathname)
                                    ? redirectToExternalSite(location.pathname)
                                    : <NotFound />
                            }
                        />
                    </Routes>
                </Suspense>
            </div>
            {!isAdminRoute && <Footer />}
            {!isAdminRoute && <BottomBar />}
            {!isAdminRoute && <CountryModal />}
        </>
    );
}

export default App;
