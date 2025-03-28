import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, TrendingUp, User, AlertTriangle, Info, X, CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { predictionState } from './utils/predictionState';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PredictionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { teamName } = location.state || { teamName: 'Unknown Team' };
  
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Current over state
  const [currentOver, setCurrentOver] = useState(1);
  const [runs, setRuns] = useState('');
  const [wickets, setWickets] = useState('');
  
  useEffect(() => {
    // If there's no team name or predictions are closed, redirect back
    if (!location.state?.teamName || !predictionState.getStatus()) {
      navigate('/team-dashboard', { 
        state: { teamName: location.state?.teamName } 
      });
    }
    
    const unsubscribe = predictionState.subscribe((status) => {
      if (!status) {
        // Redirect if predictions get closed while on this page
        navigate('/team-dashboard', { 
          state: { teamName: location.state?.teamName } 
        });
      }
    });
    
    return () => unsubscribe();
  }, [location.state, navigate]);

  useEffect(() => {
    // Auto-hide info message after 5 seconds
    const timer = setTimeout(() => {
      setShowInfo(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [location.state, navigate]);

  useEffect(() => {
    // Listen for prediction status changes
    const statusSubscription = supabase
      .channel('predictions_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictions_status'
        },
        (payload) => {
          if (payload.new.status === 'closed') {
            // Redirect to team dashboard when predictions are closed
            navigate('/team-dashboard', { 
              state: { teamName: location.state?.teamName } 
            });
          }
        }
      )
      .subscribe();
  
    return () => {
      statusSubscription.unsubscribe();
    };
  }, [navigate, location.state?.teamName]);

  // Handle input changes
  const handleRunsChange = (e) => {
    const value = e.target.value;
    // Only allow numbers between 0-36
    if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 36)) {
      setRuns(value);
    }
  };
  
  const handleWicketsChange = (e) => {
    const value = e.target.value;
    // Only allow numbers between 0-4
    if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 4)) {
      setWickets(value);
    }
  };

  // Update handleSubmit to use supabase subscription
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Validate inputs
    if (runs === '' || wickets === '') {
      setError('Please enter both runs and wickets for this over.');
      setLoading(false);
      return;
    }
    
    try {
      // First check if prediction already exists for this team
      const { data: existingPrediction } = await supabase
        .from('predictions')
        .select('*')
        .eq('team_name', teamName)
        .single();
      
      if (existingPrediction) {
        // Update existing prediction with correct column names
        const { error } = await supabase
          .from('predictions')
          .update({
            'runs': parseInt(runs),
            'wickets': parseInt(wickets)
          })
          .eq('team_name', teamName);
          
        if (error) throw error;
      } else {
        // Insert new prediction with correct column names
        const { error } = await supabase
          .from('predictions')
          .insert({
            'team_name': teamName,
            'runs': parseInt(runs),
            'wickets': parseInt(wickets)
          });
          
        if (error) throw error;
      }
      
      setSuccessMessage('Prediction submitted successfully!');
      // Clear form
      setRuns('');
      setWickets('');
      
    } catch (error) {
      console.error('Error submitting prediction:', error);
      setError('Failed to submit prediction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-200 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Score Predictions - RCB vs CSK
          </h1>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="font-medium">{teamName}</span>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8 flex-1 flex flex-col items-center">
        {/* Info message */}
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-md flex items-start max-w-xl w-full"
          >
            <Info className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-800">How to make predictions</h3>
              <p className="text-sm text-blue-700">
                Predict how many runs will be scored and how many wickets will be taken in over {currentOver}.
                Submit your prediction before the over begins!
              </p>
            </div>
            <button onClick={() => setShowInfo(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
        
        {/* Error message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md flex items-start max-w-xl w-full"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </motion.div>
        )}
        
        {/* Success message */}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-md flex items-center max-w-xl w-full"
          >
            <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
            <h3 className="font-medium text-green-800">{successMessage}</h3>
          </motion.div>
        )}
        
        {/* Main prediction form */}
        <motion.div
          key={currentOver}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-xl p-6 mb-6 max-w-xl w-full"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Current Over
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Runs prediction */}
              <div>
                <label htmlFor="runs" className="block text-sm font-medium text-gray-700 mb-1">
                  Predicted Runs
                </label>
                <input
                  id="runs"
                  type="number"
                  min="0"
                  max="36"
                  value={runs}
                  onChange={handleRunsChange}
                  placeholder="0-36 runs"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="mt-1 text-xs text-gray-500">Minimum: 0, Maximum: 36 runs</p>
              </div>
              
              {/* Wickets prediction */}
              <div>
                <label htmlFor="wickets" className="block text-sm font-medium text-gray-700 mb-1">
                  Predicted Wickets
                </label>
                <input
                  id="wickets"
                  type="number"
                  min="0"
                  max="4"
                  value={wickets}
                  onChange={handleWicketsChange}
                  placeholder="0-4 wickets"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="mt-1 text-xs text-gray-500">Minimum: 0, Maximum: 4 wickets</p>
              </div>
            </div>
            
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md ${
                loading
                  ? 'bg-purple-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
              } text-white font-medium shadow-md`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Submit Prediction for Current Over
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
        
        {/* Current stats */}
        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 max-w-xl w-full">
          <div className="text-center text-gray-700">
            <p className="font-medium">
              Predicting match between <span className="text-yellow-600">CSK</span> and <span className="text-red-600">RCB</span>
            </p>
            <p className="text-sm mt-1">
              Your predictions will be scored based on accuracy after each over
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;