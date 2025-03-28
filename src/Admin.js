import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, ArrowLeft, AlertCircle } from 'lucide-react';

// Hardcoded credentials - in a real app, these should be stored securely
const ADMIN_USERNAME = "wealadmin";
const ADMIN_PASSWORD = "wealadmin78#";

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Simple timeout to simulate server check
      await new Promise(resolve => setTimeout(resolve, 800));

      // Check against hardcoded credentials
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Successfully authenticated as admin
        console.log('Admin login successful');
        navigate('/admin-dashboard', { 
          state: { 
            admin: { 
              username: username,
              role: 'administrator',
              id: '1'
            } 
          } 
        });
      } else {
        throw new Error('Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <motion.button
          onClick={goBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mb-6 flex items-center gap-2 text-purple-700 hover:text-purple-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </motion.button>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-white shadow-xl rounded-xl overflow-hidden"
        >
          <div className="text-center bg-gradient-to-r from-blue-600 to-purple-700 text-white py-6 px-4">
            <div className="flex justify-center mb-2">
              <LogIn className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold">Admin Login</h2>
            <p className="text-blue-100">Access your dashboard</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="pt-2"
              >
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-4 rounded-md shadow-md flex items-center justify-center ${
                    loading ? 'opacity-70 cursor-not-allowed' : 'hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Logging in...
                    </>
                  ) : (
                    <>
                      Login
                      <LogIn className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;