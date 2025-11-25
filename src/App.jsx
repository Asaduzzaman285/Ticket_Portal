import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Master from './layouts/admin/Master';
import Login from './components/Auth/Login';
import PrivateRoute from './routes/PrivateRoute';
import './index.css';

const App = () => {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Master />
              </PrivateRoute>
            }
           
          />
        </Routes>
      </Router>
    </div>
  );
};

export default App;