import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  AppWindow, 
  Shield, 
  Users, 
  Eye, 
  Settings, 
  Banknote, 
  WalletCards ,
  FileText,
  BarChart3,  // Add this
  Store
} from 'lucide-react';

const Sidebar = () => {
    const navigate = useNavigate();
    const userName = localStorage.getItem('userName'); // Retrieve the user's name

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        navigate('/login'); // Redirect to the login page
    };

    return (
        <nav className="sb-sidenav accordion sb-sidenav-light " id="sidenavAccordion" >
            <div className="sb-sidenav-menu" style={{
                // borderRight: '1px solid #ddd',
            
            }}>
                <div className="nav text-dark">
                    <NavLink className="nav-link" to="/admin/home" activeClassName="active">
                        <div className="sb-nav-link-icon">
                            <LayoutDashboard size={20} />
                        </div>
                        Lottery Dashboard
                    </NavLink>

                    {/* <NavLink className="nav-link" to="/admin/detailed-report" activeClassName="active">
                        <div className="sb-nav-link-icon">
                            <i className="fa-solid fa-file-invoice" style={{ fontSize: '20px' }}></i>
                        </div>
                        Sales Report
                    </NavLink> */}
   {/* Report Menu */}
<div
    className="nav-link d-flex justify-content-between align-items-center"
    data-bs-toggle="collapse"
    data-bs-target="#reportMenu"
    aria-expanded="false"
    aria-controls="reportMenu"
    style={{ cursor: 'pointer'}}
>
    <div className="d-flex align-items-center">
        <div className="sb-nav-link-icon">
            <FileText size={18} />
        </div>
        Report
    </div>
    <i className="fas fa-chevron-down"></i>
</div>
<div className="collapse" id="reportMenu">
    <NavLink className="nav-link ms-4" to="/admin/detailed-report" style={{ fontSize: '13px' }}>
        <FileText size={16} className="me-2" />
        Sales Details Report
    </NavLink>
    <NavLink className="nav-link ms-4" to="/admin/summary-report" style={{ fontSize: '13px' }}>
        <BarChart3 size={16} className="me-2" />
        Sales Summary Report
    </NavLink>
    <NavLink className="nav-link ms-4" to="/admin/merchant-allotment" style={{ fontSize: '13px' }}>
        <Store size={16} className="me-2" />
        Merchant Wise Allotment
    </NavLink>
</div>

             
                    <div
                        className="nav-link d-flex justify-content-between align-items-center"
                        data-bs-toggle="collapse"
                        data-bs-target="#accessControlMenu"
                        aria-expanded="false"
                        aria-controls="accessControlMenu"
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="d-flex align-items-center">
                            <div className="sb-nav-link-icon">
                                <Shield size={20}  />
                            </div>
                            Access Control
                        </div>
                        <i className="fas fa-chevron-down"></i>
                    </div>
                    <div className="collapse" id="accessControlMenu">
                        <NavLink className="nav-link ms-4" to="/admin/user" style={{ fontSize: '13px' }}>
                            <Users size={16} className="me-2 " />
                            User
                        </NavLink>
                        <NavLink className="nav-link ms-4" to="/admin/role" style={{ fontSize: '13px' }}>
                            <Eye size={16} className="me-2 " />
                            Role
                        </NavLink>
                        {/* <NavLink className="nav-link ms-4" to="/admin/portal-role">
                            <Eye size={16} className="me-2 " />
                            Portal Role
                        </NavLink> */}

                    
                    </div>

                    {/* Bank Details main menu */}
                    {/* <div
                        className="nav-link d-flex justify-content-between align-items-center"
                        data-bs-toggle="collapse"
                        data-bs-target="#bankDetailsMenu"
                        aria-expanded="false"
                        aria-controls="bankDetailsMenu"
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="d-flex align-items-center">
                            <div className="sb-nav-link-icon">
                                <Settings size={20}  />
                            </div>
                            Settings
                        </div>
                        <i className="fas fa-chevron-down"></i>
                    </div> */}
                    {/* <div className="collapse" id="bankDetailsMenu">
                    
                        <NavLink className="nav-link ms-4" to="/admin/payment-account">
                            <WalletCards size={16} className="me-2 " />
                            Payment Account
                        </NavLink>
                   
                    </div> */}
                </div>
            </div>
        </nav>
    );
};

export default Sidebar;