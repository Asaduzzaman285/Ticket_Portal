import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/image/lotterylogo.png'; // Adjust the path as necessary
import { LogOut } from 'lucide-react';
const Navbar = ({ onSidebarToggle }) => {
    const navigate = useNavigate();
    const userName = localStorage.getItem("userName");

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userName");
        navigate("/login");
    };

    
    return (
        <nav className="sb-topnav navbar navbar-expand navbar-white">
        <Link
  className="navbar-brand d-flex align-items-center"
  to="/index.html"
  style={{
    width: "200px",
    height: "60px",
    padding: "0 16px",        // horizontal padding only
    // borderRight: "1px solid #ddd",
    boxSizing: "border-box",
  }}
>
  <img
    src={logo}
    alt="Logo"
    style={{
      width: "calc(100% - 0px)",  // account for container padding
      height: "auto",
      maxHeight: "40px",           // limit height to give top/bottom space
      objectFit: "cover",
    }}
  />
</Link>




            <button
                className="btn btn-link btn-sm order-1 order-lg-0 me-4 me-lg-0"
                id="sidebarToggle"
                onClick={onSidebarToggle}
            >
               <i className="fas fa-bars text-white"></i>

            </button>

            <form className="d-none d-md-inline-block form-inline ms-auto me-0 me-md-3 my-2 my-md-0"></form>

            <ul className="navbar-nav ms-auto ms-md-0 me-3 me-lg-4">
                <li className="nav-item dropdown">
                    <Link
                        className="nav-link dropdown-toggle text-white"
                        id="navbarDropdown"
                        to="#"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                    >
                        <i className="fas fa-user text-white fa-fw"></i> {userName}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
                        {/* <li>
                            <hr className="dropdown-divider" />
                        </li> */}
                        <li>
                            <button onClick={handleLogout} className="dropdown-item">
                                <LogOut size={16} className="me-2" />
                                Logout
                            </button>
                        </li>
                    </ul>
                </li>
            </ul>
        </nav>
    );
};

export default Navbar;