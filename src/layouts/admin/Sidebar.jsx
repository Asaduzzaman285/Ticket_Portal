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
  WalletCards,
  FileText,
  BarChart3,
  Store,
  Ticket
} from 'lucide-react';

const Sidebar = () => {
    const navigate = useNavigate();
    const userName = localStorage.getItem('userName');
    
    // Get permissions from localStorage (stored during login)
    const permissionsString = localStorage.getItem('permissions');
    const permissions = permissionsString ? JSON.parse(permissionsString) : [];

    // Check for specific permissions
    const hasUserList = permissions.includes('user list');
    const hasRoleList = permissions.includes('role list');
    const hasPermissionList = permissions.includes('permission list');
    
    // Show Access Control menu only if user has at least one of the required permissions
    const showAccessControl = hasUserList || hasRoleList || hasPermissionList;

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        localStorage.removeItem('permissions'); // Also remove permissions on logout
        navigate('/login');
    };

    return (
        <nav className="sb-sidenav accordion sb-sidenav-light" id="sidenavAccordion">
            <div className="sb-sidenav-menu">
                <div className="nav text-dark">
                    <NavLink className="nav-link" to="/admin/home" activeClassName="active">
                        <div className="sb-nav-link-icon">
                            <LayoutDashboard size={20} />
                        </div>
                        Dashboard
                    </NavLink>

                    <NavLink className="nav-link" to="/admin/ticket" activeClassName="active">
                        <div className="sb-nav-link-icon">
                            <Ticket size={20} />
                        </div>
                        TicketPage
                    </NavLink>

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
                    </div>

                    {/* Access Control Menu - Conditionally Rendered */}
                    {showAccessControl && (
                        <>
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
                                        <Shield size={20} />
                                    </div>
                                    Access Control
                                </div>
                                <i className="fas fa-chevron-down"></i>
                            </div>
                            <div className="collapse" id="accessControlMenu">
                                {/* User Menu Item - Only show if user has "user list" permission */}
                                {hasUserList && (
                                    <NavLink className="nav-link ms-4" to="/admin/user" style={{ fontSize: '13px' }}>
                                        <Users size={16} className="me-2" />
                                        User
                                    </NavLink>
                                )}
                                
                                {/* Role Menu Item - Only show if user has "role list" permission */}
                                {hasRoleList && (
                                    <NavLink className="nav-link ms-4" to="/admin/role" style={{ fontSize: '13px' }}>
                                        <Eye size={16} className="me-2" />
                                        Role
                                    </NavLink>
                                )}
                                
                              
                            </div>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Sidebar;