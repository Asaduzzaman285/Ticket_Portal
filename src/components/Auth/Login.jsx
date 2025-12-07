import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import Logo from '../../assets/image/lotterylogo.png';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    // Configure Toast for Success (Green)
    const SuccessToast = Swal.mixin({
        toast: true,
        position: "top-end",
        background: "#28a745",
        color: "#fff",
        iconColor: "#fff",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
            popup: 'small-toast',
            icon: 'small-toast-icon'
        },
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });

    // Configure Toast for Error (Red)
    const ErrorToast = Swal.mixin({
        toast: true,
        position: "top-end",
        background: "#dc3545",
        color: "#fff",
        iconColor: "#fff",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
            popup: 'small-toast',
            icon: 'small-toast-icon'
        },
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        const { email, password } = formData;
        try {
            axios.defaults.headers.post['Content-Type'] = 'application/json';

            const response = await axios.post(
                import.meta.env.VITE_APP_API_BASE_URL + '/api/v1/login',
                { email, password }
            );

            if (response.data.status === 'success') {
                // Store user data in localStorage
                localStorage.setItem('authToken', response.data.data.user.access_token);
                localStorage.setItem('userName', response.data.data.user.name);
                localStorage.setItem('userEmail', response.data.data.user.email);
                localStorage.setItem('userId', response.data.data.user.userId);
                
                // Store roles and permissions
                localStorage.setItem('userRoles', JSON.stringify(response.data.data.roles));
                localStorage.setItem('permissions', JSON.stringify(response.data.data.permissions));

                // Success Toast
                SuccessToast.fire({
                    icon: 'success',
                    title: `Welcome, ${response.data.data.user.name}!`
                });

                navigate('/admin/home');
            } else {
                // Error Toast
                ErrorToast.fire({
                    icon: 'error',
                    title: 'Invalid email or password'
                });
                setIsLoading(false);
            }
        } catch (err) {
            // Handle specific error cases
            if (err.response) {
                // Server responded with an error status
                if (err.response.status === 401) {
                    ErrorToast.fire({
                        icon: 'error',
                        title: 'Invalid email or password'
                    });
                } else if (err.response.status === 422) {
                    ErrorToast.fire({
                        icon: 'error',
                        title: 'Validation error. Please check your input.'
                    });
                } else {
                    ErrorToast.fire({
                        icon: 'error',
                        title: 'Something went wrong. Please try again.'
                    });
                }
            } else if (err.request) {
                // Request was made but no response received
                ErrorToast.fire({
                    icon: 'error',
                    title: 'Network error. Please check your connection.'
                });
            } else {
                // Something else happened
                ErrorToast.fire({
                    icon: 'error',
                    title: 'Something went wrong. Please try again.'
                });
            }
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="logo-container">
                    <img src={Logo} alt="Logo" width="150" />
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="user-box">
                        <input
                            type="email"
                            name="email"
                            id="email"
                            value={formData.email}
                            onChange={handleChange}
                            readOnly={isLoading}
                            onFocus={(e) => isLoading && e.target.blur()}
                            placeholder=""
                            required
                            autoComplete="email"
                        />
                        <label>Email</label>
                    </div>

                    <div className="user-box password-box">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            id="password"
                            value={formData.password}
                            onChange={handleChange}
                            readOnly={isLoading}
                            onFocus={(e) => isLoading && e.target.blur()}
                            placeholder=""
                            required
                            style={{ paddingRight: '40px' }}
                            autoComplete="current-password"
                        />
                        <label>Password</label>
                        <i 
                            className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#fff',
                                cursor: 'pointer',
                                zIndex: 1
                            }}
                            onClick={() => setShowPassword(!showPassword)}
                        />
                    </div>

                 <button 
  type="submit" 
  className="submit-btn" 
  disabled={isLoading}
  style={{
    backgroundColor: '#4d90fe',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    opacity: isLoading ? 0.7 : 1,
    transition: 'background-color 0.3s ease',
    width: '100%',
    marginTop: '20px'
  }}
  onMouseOver={(e) => !isLoading && (e.target.style.backgroundColor = '#357ae8')}
  onMouseOut={(e) => !isLoading && (e.target.style.backgroundColor = '#4d90fe')}
>
  {isLoading ? (
    <>
      <i className="fas fa-spinner fa-spin me-2"></i>
      Logging in...
    </>
  ) : (
    'Login'
  )}
</button>
                </form>
            </div>
        </div>
    );
};

export default Login;