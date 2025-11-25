import React from 'react';
import Homepage from '../components/Homepage';
import UserPage from '../components/UserPage';
// import BankPage from '../components/BankPage';
// import BankAccount from '../components/BankAccount';
import ApplicationPage from '../components/ApplicationPage';
import PortalRolePage from '../components/PortalRolePage';
import InvoiceListPage from '../components/InvoiceListPage';
import InvoiceCreatePage from '../components/InvoiceCreatePage';
import InvoiceEditPage from '../components/InvoiceEditpage';
import RoleListPage from '../components/RoleListPage';
import CreateRolePage from '../components/CreateRolePage';
import PaymentAccountPage from '../components/PaymentAccountPage';


const routes = [
   

    { path: '/admin/home', exact: true, name: 'Homepage', component: (props) => <Homepage {...props} /> },
    { path: '/admin/role', exact: true, name: 'RoleListPage', component: (props) => <RoleListPage {...props} /> },
    { path: '/admin/roles/create', exact: true, name: 'CreateRolePage', component: (props) => <CreateRolePage {...props} /> },
    { path: '/admin/user', exact: true, name: 'UserPage', component: (props) => <UserPage {...props} /> },
    // { path: '/admin/bank', exact: true, name: 'BankPage', component: (props) => <BankPage {...props} /> },
    { path: '/admin/payment-account', exact: true, name: 'PaymentAccountPage', component: (props) => <PaymentAccountPage{...props} /> },
    { path: '/admin/apps', exact: true, name: 'ApplicationPage', component: (props) => <ApplicationPage{...props} /> },
    { path: '/admin/portal-role', exact: true, name: 'PortalRolePage', component: (props) => <PortalRolePage{...props} /> },
    { path: '/admin/wintext-invoice', exact: true, name: 'InvoiceListPage', component: (props) => <InvoiceListPage{...props} /> },
    { path: '/admin/invoices/create', exact: true, name: 'InvoiceCreatePage', component: (props) => <InvoiceCreatePage{...props} /> },
    {
        path: '/admin/invoices/edit/:id',
        exact: true,
        name: 'InvoiceEditPage',
        component: (props) => <InvoiceEditPage {...props} />
    }
];
export default routes;