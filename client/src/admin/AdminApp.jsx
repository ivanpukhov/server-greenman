import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { Admin, Layout, Resource } from 'react-admin';
import authProvider from './authProvider';
import dataProvider from './dataProvider';
import adminTheme from './theme';
import AdminLoginPage from './AdminLoginPage';
import AdminDashboard from './AdminDashboard';
import { OrderEdit, OrderList, OrderShow } from './resources/orders';
import { ProductCreate, ProductEdit, ProductList, ProductShow } from './resources/products';

const AdminLayout = (props) => <Layout {...props} sx={{ '& .RaLayout-appFrame': { backgroundColor: '#f1f5ef' } }} />;

const AdminApp = () => (
    <Admin
        title="Greenman Admin"
        basename="/admin"
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
            icon={ShoppingCartOutlinedIcon}
        />
    </Admin>
);

export default AdminApp;
