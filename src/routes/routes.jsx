import React from 'react';
import Homepage from '../components/Homepage';
import UserPage from '../components/UserPage';
// import BankPage from '../components/BankPage';
// import BankAccount from '../components/BankAccount';
import ApplicationPage from '../components/ApplicationPage';

import RoleListPage from '../components/RoleListPage';
import CreateRolePage from '../components/CreateRolePage';
import DetailsReportListPage from '../components/DetailsReportListPage';
import SalesSummaryReportPage from '../components/SalesSummaryReportPage';
// import MerchantWiseAllotmentPage from '../components/MerchantWiseAllotmentPage';
import TicketPage from '../components/TicketPage';
import PurchaseLogPage from '../components/PurchaseLogPage';

const routes = [
   

    { path: '/admin/home', exact: true, name: 'Homepage', component: (props) => <Homepage {...props} /> },
    { path: '/admin/role', exact: true, name: 'RoleListPage', component: (props) => <RoleListPage {...props} /> },
    { path: '/admin/roles/create', exact: true, name: 'CreateRolePage', component: (props) => <CreateRolePage {...props} /> },
    { path: '/admin/user', exact: true, name: 'UserPage', component: (props) => <UserPage {...props} /> },
    // { path: '/admin/bank', exact: true, name: 'BankPage', component: (props) => <BankPage {...props} /> },
    { path: '/admin/payment-account', exact: true, name: 'PaymentAccountPage', component: (props) => <PaymentAccountPage{...props} /> },
    { path: '/admin/apps', exact: true, name: 'ApplicationPage', component: (props) => <ApplicationPage{...props} /> },
    { path: '/admin/portal-role', exact: true, name: 'PortalRolePage', component: (props) => <PortalRolePage{...props} /> },
    { path: '/admin/detailed-report', exact: true, name: 'DetailsReportListPage', component: (props) => <DetailsReportListPage{...props} /> },
    { path: '/admin/summary-report', exact: true, name: 'SalesSummaryReportPage', component: (props) => <SalesSummaryReportPage{...props} /> },
    { path: '/admin/purchase-log', exact: true, name: 'PurchaseLogPage', component: (props) => <PurchaseLogPage{...props} /> },

   

    // { path: '/admin/merchant-allotment', exact: true, name: 'MerchantWiseAllotmentPage', component: (props) => <MerchantWiseAllotmentPage{...props} /> },
     { path: '/admin/ticket', exact: true, name: 'TicketPage', component: (props) => <TicketPage{...props} /> },
   
   
    { path: '/admin/invoices/create', exact: true, name: 'InvoiceCreatePage', component: (props) => <InvoiceCreatePage{...props} /> },
    {
        path: '/admin/invoices/edit/:id',
        exact: true,
        name: 'InvoiceEditPage',
        component: (props) => <InvoiceEditPage {...props} />
    }
  
];
export default routes;