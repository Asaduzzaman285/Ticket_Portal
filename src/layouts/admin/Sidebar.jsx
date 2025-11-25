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
  WalletCards 
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
                        Invoice Dashboard
                    </NavLink>

                    {/* <NavLink className="nav-link" to="/admin/wintext-invoice" activeClassName="active">
                        <div className="sb-nav-link-icon">
                            <Receipt size={20} className="text-white" />
                        </div>
                        Wintext Invoice
                    </NavLink> */}
                    <NavLink className="nav-link" to="/admin/wintext-invoice" activeClassName="active">
                        <div className="sb-nav-link-icon">
                            <i className="fa-solid fa-file-invoice" style={{ fontSize: '20px' }}></i>
                        </div>
                        Wintext Invoice
                    </NavLink>
                    {/* <NavLink className="nav-link" to="/admin/ads" activeClassName="active">
            <div className="sb-nav-link-icon">
              <i className="fas fa-tachometer-alt"></i>
            </div>
            Winfin Invoice
          </NavLink> */}
                    {/* <NavLink className="nav-link" to="/admin/apps" activeClassName="active">
                        <div className="sb-nav-link-icon">
                            <AppWindow size={20} className="text-white" />
                        </div>
                        Application
                    </NavLink> */}
             
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
                        <NavLink className="nav-link ms-4" to="/admin/user">
                            <Users size={16} className="me-2 " />
                            User
                        </NavLink>
                        <NavLink className="nav-link ms-4" to="/admin/role">
                            <Eye size={16} className="me-2 " />
                            Role
                        </NavLink>
                        {/* <NavLink className="nav-link ms-4" to="/admin/portal-role">
                            <Eye size={16} className="me-2 " />
                            Portal Role
                        </NavLink> */}

                    
                    </div>

                    {/* Bank Details main menu */}
                    <div
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
                    </div>
                    <div className="collapse" id="bankDetailsMenu">
                        {/* <NavLink className="nav-link ms-4" to="/admin/bank">
                            <Banknote size={16} className="me-2" />
                            Bank
                        </NavLink> */}
                        <NavLink className="nav-link ms-4" to="/admin/payment-account">
                            <WalletCards size={16} className="me-2 " />
                            Payment Account
                        </NavLink>
                        {/* <NavLink className="nav-link ms-4" to="/admin/apps">
                            <AppWindow size={16} className="me-2" />
                            Application
                        </NavLink> */}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Sidebar;