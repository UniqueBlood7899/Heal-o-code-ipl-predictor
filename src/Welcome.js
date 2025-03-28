import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Trophy } from 'lucide-react';

const Welcome = () => {
  const [teamName, setTeamName] = useState('');
  const navigate = useNavigate();

  const handleAdminLogin = () => {
    // TODO: Implement actual admin login logic
    // Navigate to admin page when it's created
    navigate('/admin');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Navigate to problem statements with team name as state
    if (teamName.trim()) {
      navigate('/team-dashboard', { state: { teamName } });
    }
    console.log('Team submitted:', teamName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 flex flex-col items-center justify-center p-4">
      {/* Admin Login Button */}
      <motion.div 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-4 right-4"
      >
        <motion.button 
          onClick={handleAdminLogin}
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 px-4 py-2 rounded-lg shadow-md"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <LogIn className="w-5 h-5" />
          Admin Login
        </motion.button>
      </motion.div>

      {/* Main Welcome Card */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 120 }}
        className="w-full max-w-md shadow-2xl border-2 border-purple-200 rounded-xl overflow-hidden bg-white"
      >
        <div className="text-center bg-gradient-to-r from-purple-500 to-pink-500 text-white py-6 px-4">
          <div className="flex justify-center mb-4">
            <Trophy className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            IPL Score Prediction
          </h2>
        </div>
          
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Your Team Name
              </label>
              <input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white py-2 px-4 rounded-md shadow-md"
              >
                Start Prediction
              </button>
            </motion.div>
          </form>
        </div>
      </motion.div>

      {/* Background Decorative Elements */}
      <motion.div 
        className="absolute bottom-0 left-0 opacity-20"
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: "linear" 
        }}
      >
      </motion.div>
    </div>
  );
};

export default Welcome;