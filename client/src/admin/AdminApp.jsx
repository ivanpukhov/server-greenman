import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import {
    Box,
    IconButton,
    Stack,
    Tooltip,
    Typography,
    useMediaQuery
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Admin,
    AppBar,
    Layout,
    Menu,
    Resource,
    useLogout
} from 'react-admin';
import authProvider from './authProvider';
import dataProvider from './dataProvider';
import adminTheme from './theme';
import AdminLoginPage from './AdminLoginPage';
import AdminDashboard from './AdminDashboard';
import AccountingPage from './AccountingPage';
import AccountingFullAccessPage from './AccountingFullAccessPage';
import AdministratorsPage from './AdministratorsPage';
import IncomingStockPage from './IncomingStockPage';
import QrCodesPage from './QrCodesPage';
import PaymentLinkConnectionsPage from './PaymentLinkConnectionsPage';
import AddExpensePage from './AddExpensePage';
import AliasesPage from './AliasesPage';
import WhatsAppTemplateTestPage from './WhatsAppTemplateTestPage';
import WhatsAppConnectionPage from './WhatsAppConnectionPage';
import KazpostRequestsPage from './KazpostRequestsPage';
import OrderDraftRequestsPage from './OrderDraftRequestsPage';
import CdekSettingsPage from './CdekSettingsPage';
import SocialAdminPage from './social/SocialAdminPage';
import { OrderCreate, OrderEdit, OrderList, OrderShow } from './resources/orders';
import { OrderRfEdit, OrderRfList, OrderRfShow } from './resources/ordersRf';
import { ProductCreate, ProductEdit, ProductList, ProductShow } from './resources/products';
import { adminAuthStorage } from './authProvider';
import './AdminApp.css';

const AdminAppBar = () => {
    const logout = useLogout();
    const isMobile = useMediaQuery((t) => t.breakpoints.down('md'));

    return (
        <AppBar
            userMenu={false}
            color="inherit"
            elevation={0}
            toolbar={<Box />}
            className="admin-topbar"
            position="sticky"
            sx={{
                backgroundColor: 'background.paper',
                color: 'text.primary',
                borderBottom: '1px solid',
                borderColor: 'divider',
                backgroundImage: 'none',
                boxShadow: 'none'
            }}
        >
            <Box className="admin-topbar__inner">
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                                fontSize: { xs: '1rem', md: '1.05rem' },
                                lineHeight: 1.1,
                                letterSpacing: '-0.01em',
                                color: 'text.primary'
                            }}
                            noWrap
                        >
                            Greenman Admin
                        </Typography>
                        {!isMobile && (
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', fontSize: '0.78rem' }}
                            >
                                Управление каталогом, заказами и складом
                            </Typography>
                        )}
                    </Box>
                </Stack>
                <Box className="admin-topbar__actions">
                    <Tooltip title="Выйти">
                        <IconButton
                            size="small"
                            onClick={() => logout()}
                            sx={{
                                color: 'text.secondary',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                '&:hover': {
                                    color: 'error.main',
                                    borderColor: 'error.main',
                                    backgroundColor: (t) => alpha(t.palette.error.main, 0.06)
                                }
                            }}
                        >
                            <LogoutOutlinedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        </AppBar>
    );
};

const MENU_GROUPS = [
    {
        label: 'Магазин',
        resources: ['products', 'orders', 'orders-rf', 'qr-codes', 'incoming']
    },
    {
        label: 'Логистика',
        resources: ['cdek-settings', 'kazpost-requests', 'order-draft-requests']
    },
    {
        label: 'Финансы',
        resources: ['accounting', 'accounting-full', 'add-expense']
    },
    {
        label: 'Коммуникации',
        resources: ['whatsapp-connection', 'whatsapp-templates', 'social']
    },
    {
        label: 'Настройки',
        resources: ['administrators', 'aliases', 'payment-link-connections']
    }
];

const MenuGroupLabel = ({ children }) => (
    <Typography
        sx={{
            px: 2,
            pt: 1.75,
            pb: 0.5,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'text.secondary'
        }}
    >
        {children}
    </Typography>
);

const AdminMenu = () => (
    <Menu
        className="admin-menu"
        sx={{
            py: 1,
            '& .RaMenu-list': { py: 0 }
        }}
    >
        <Menu.DashboardItem leftIcon={<DashboardOutlinedIcon />} primaryText="Дашборд" />
        {MENU_GROUPS.map((group) => (
            <Box key={group.label}>
                <MenuGroupLabel>{group.label}</MenuGroupLabel>
                {group.resources.map((name) => (
                    <Menu.ResourceItem key={name} name={name} />
                ))}
            </Box>
        ))}
    </Menu>
);

const AdminLayout = (props) => (
    <Layout
        {...props}
        menu={AdminMenu}
        appBar={AdminAppBar}
        className="admin-shell"
        sx={{
            backgroundColor: 'background.default',
            '& .RaLayout-appFrame': {
                backgroundColor: 'transparent'
            },
            '& .RaLayout-content': {
                backgroundColor: 'transparent'
            }
        }}
    />
);

const AdminApp = () => {
    const isIvan = adminAuthStorage.isIvan();

    return (
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
                name="orders-rf"
                options={{ label: 'Заказы РФ' }}
                list={OrderRfList}
                show={OrderRfShow}
                edit={OrderRfEdit}
                icon={LocalShippingOutlinedIcon}
            />
            <Resource
                name="qr-codes"
                options={{ label: 'QR коды' }}
                list={QrCodesPage}
                icon={QrCode2OutlinedIcon}
            />
            <Resource
                name="incoming"
                options={{ label: 'Приход товара' }}
                list={IncomingStockPage}
                icon={WarehouseOutlinedIcon}
            />
            <Resource
                name="cdek-settings"
                options={{ label: 'Настройки СДЭК' }}
                list={CdekSettingsPage}
                icon={LocalShippingOutlinedIcon}
            />
            <Resource
                name="kazpost-requests"
                options={{ label: 'Казпочта треки' }}
                list={KazpostRequestsPage}
                icon={LocalShippingOutlinedIcon}
            />
            <Resource
                name="order-draft-requests"
                options={{ label: 'Ваш заказ' }}
                list={OrderDraftRequestsPage}
                icon={AssignmentOutlinedIcon}
            />
            <Resource
                name="accounting"
                options={{ label: 'Бухгалтерия' }}
                list={AccountingPage}
                icon={AccountBalanceWalletOutlinedIcon}
            />
            {isIvan ? (
                <Resource
                    name="accounting-full"
                    options={{ label: 'Полная сводка счетов' }}
                    list={AccountingFullAccessPage}
                    icon={AccountBalanceWalletOutlinedIcon}
                />
            ) : null}
            <Resource
                name="add-expense"
                options={{ label: 'Добавить расход' }}
                list={AddExpensePage}
                icon={PointOfSaleOutlinedIcon}
            />
            <Resource
                name="whatsapp-connection"
                options={{ label: 'WhatsApp подключение' }}
                list={WhatsAppConnectionPage}
                icon={SmsOutlinedIcon}
            />
            <Resource
                name="whatsapp-templates"
                options={{ label: 'WhatsApp шаблоны' }}
                list={WhatsAppTemplateTestPage}
                icon={SmsOutlinedIcon}
            />
            <Resource
                name="social"
                options={{ label: 'Соцсеть' }}
                list={SocialAdminPage}
                icon={GroupsOutlinedIcon}
            />
            <Resource
                name="administrators"
                options={{ label: 'Администраторы' }}
                list={AdministratorsPage}
                icon={ManageAccountsOutlinedIcon}
            />
            <Resource
                name="aliases"
                options={{ label: 'Псевдонимы' }}
                list={AliasesPage}
                icon={LabelOutlinedIcon}
            />
            <Resource
                name="payment-link-connections"
                options={{ label: 'Связи клиент-ссылка' }}
                list={PaymentLinkConnectionsPage}
                icon={LinkOutlinedIcon}
            />
        </Admin>
    );
};

export default AdminApp;
