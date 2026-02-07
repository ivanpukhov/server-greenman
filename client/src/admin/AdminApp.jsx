import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { Box, Button, Chip, Typography } from '@mui/material';
import { Admin, AppBar, Layout, Menu, Resource, useLogout } from 'react-admin';
import authProvider from './authProvider';
import dataProvider from './dataProvider';
import adminTheme from './theme';
import AdminLoginPage from './AdminLoginPage';
import AdminDashboard from './AdminDashboard';
import AccountingPage from './AccountingPage';
import IncomingStockPage from './IncomingStockPage';
import QrCodesPage from './QrCodesPage';
import { OrderCreate, OrderEdit, OrderList, OrderShow } from './resources/orders';
import { ProductCreate, ProductEdit, ProductList, ProductShow } from './resources/products';
import './AdminApp.css';

const AdminAppBar = () => {
    const logout = useLogout();

    return (
        <AppBar
            userMenu={false}
            color="transparent"
            toolbar={<Box />}
            className="admin-topbar"
            position="sticky"
        >
            <Box className="admin-topbar__inner">
                <Box>
                    <Typography variant="h6" className="admin-topbar__title">
                        Greenman Admin
                    </Typography>
                    <Typography variant="caption" className="admin-topbar__subtitle">
                        Управление каталогом, заказами и складом
                    </Typography>
                </Box>
                <Box className="admin-topbar__actions">
                    <Chip size="small" color="success" label="Система активна" />
                    <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={() => logout()}
                        startIcon={<LogoutOutlinedIcon />}
                    >
                        Выход
                    </Button>
                </Box>
            </Box>
        </AppBar>
    );
};

const AdminMenu = () => (
    <Menu className="admin-menu">
        <Menu.DashboardItem />
        <Menu.ResourceItems />
    </Menu>
);

const AdminLayout = (props) => (
    <Layout
        {...props}
        menu={AdminMenu}
        appBar={AdminAppBar}
        sx={{
            '& .RaLayout-appFrame': {
                backgroundColor: 'transparent'
            }
        }}
        className="admin-shell"
    />
);

const AdminApp = () => (
    <Admin
        title="Greenman Admin"
        layout={AdminLayout}
        dashboard={AdminDashboard}
        authProvider={authProvider}
        dataProvider={dataProvider}
        loginPage={AdminLoginPage}
        theme={adminTheme}
    >
        <Resource
            name="products"
            options={{ label: 'Товары' }}
            list={ProductList}
            show={ProductShow}
            edit={ProductEdit}
            create={ProductCreate}
            icon={Inventory2OutlinedIcon}
            recordRepresentation="name"
        />
        <Resource
            name="orders"
            options={{ label: 'Заказы' }}
            list={OrderList}
            show={OrderShow}
            edit={OrderEdit}
            create={OrderCreate}
            icon={ShoppingCartOutlinedIcon}
        />
        <Resource
            name="accounting"
            options={{ label: 'Бухгалтерия' }}
            list={AccountingPage}
            icon={AccountBalanceWalletOutlinedIcon}
        />
        <Resource
            name="incoming"
            options={{ label: 'Приход товара' }}
            list={IncomingStockPage}
            icon={WarehouseOutlinedIcon}
        />
        <Resource
            name="qr-codes"
            options={{ label: 'QR коды' }}
            list={QrCodesPage}
            icon={QrCode2OutlinedIcon}
        />
    </Admin>
);

export default AdminApp;
