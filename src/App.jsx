//app.jsx
import React, {useEffect} from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { fetchProfile, logout } from './redux/slices/authSlice';
import { store } from './redux/store';
import Navbar from './components/Navbar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Products from './pages/products';
import Categories from './pages/categories';
import Discounts from './pages/discounts';
import Blogs from './pages/blogs';
import Orders from './pages/orders';
import Login from './pages/Login';
import Settings from './pages/settings';
import AuthGuard from './components/AuthGuard';
import Manufacturer from './pages/Manufacturer';
import './App.css';

const AppContent = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Add this useEffect to validate token on app load
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchProfile())
        .unwrap()
        .catch((error) => {
          // Automatically logout if profile fetch fails (expired/invalid token)
          console.error('Token validation failed:', error);
          dispatch(logout());
        });
    }
  }, []); // Run only once on mount

  // Listen for localStorage changes (for manual token removal)
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('adminToken');
      
      // If token was removed but Redux still thinks user is authenticated
      if (!token && isAuthenticated) {
        dispatch(logout());
      }
    };

    // Listen for changes from other tabs
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for changes in same tab (manual removal via DevTools)
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, [isAuthenticated, dispatch]);
  
  return (
    <div className="App">
      {isAuthenticated ? (
        <div className="flex h-screen bg-gray-100">
          {/* Sidebar Navigation */}
          <Navbar />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Navigation */}
            <Topbar />
            
            {/* Page Content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <AuthGuard>
                      <Dashboard />
                    </AuthGuard>
                  } 
                />
                <Route 
                  path="/products" 
                  element={
                    <AuthGuard>
                      <Products />
                    </AuthGuard>
                  } 
                />
                <Route 
                  path="/categories" 
                  element={
                    <AuthGuard>
                      <Categories />
                    </AuthGuard>
                  } 
                />
                <Route
                  path="/manufacturers"
                  element={
                    <AuthGuard>
                      <Manufacturer />
                    </AuthGuard>
                  }
                />
                <Route 
                  path="/discounts" 
                  element={
                    <AuthGuard>
                      <Discounts />
                    </AuthGuard>
                  } 
                />
                <Route 
                  path="/blogs" 
                  element={
                    <AuthGuard>
                      <Blogs />
                    </AuthGuard>
                  } 
                />
                <Route 
                  path="/orders" 
                  element={
                    <AuthGuard>
                      <Orders />
                    </AuthGuard>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <AuthGuard>
                      <Settings />
                    </AuthGuard>
                  } 
                />
                {/* Catch all route for authenticated users */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </div>
  );
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
}

export default App;