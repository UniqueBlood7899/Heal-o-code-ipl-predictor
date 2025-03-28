import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Trophy, Medal, ArrowRight, TrendingUp, Loader2, 
  AlertTriangle, RefreshCw, User, Crown, Clock
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { isPredictionStatusOpen } from './AdminDashboard';
import { predictionState } from './utils/predictionState';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TeamDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { teamName } = location.state || {};
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [score, setScore] = useState(0);
  const [position, setPosition] = useState(1); // Default position as 1
  const [refreshing, setRefreshing] = useState(false);
  const [predictionAvailable, setPredictionAvailable] = useState(predictionState.getStatus());
  
  const registerTeam = async () => {
    try {
      // Check if team exists
      const { data: existingTeam, error: checkError } = await supabase
        .from('teams')
        .select('team_name')
        .eq('team_name', teamName)
        .single();

      // If team not found
      if (!existingTeam) {
        setError('Team not found. Please contact the administrator.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying team:', error);
      setError('Unable to verify team. Please try again.');
      return false;
    }
  };

  // Update the useEffect to handle team verification
  useEffect(() => {
    const verifyAndRegisterTeam = async () => {
      if (!teamName) {
        navigate('/');
      } else {
        const registered = await registerTeam();
        if (!registered) {
          // If registration fails, navigate back to home after 3 seconds
          setTimeout(() => {
            navigate('/');
          }, 3000);
        } else {
          fetchTeamData();
          
          const unsubscribe = predictionState.subscribe((status) => {
            setPredictionAvailable(status);
          });
          
          return () => {
            unsubscribe();
          };
        }
      }
    };

    verifyAndRegisterTeam();
  }, [teamName, navigate]);
  
  const fetchTeamData = async () => {
    if (!teamName) return;
    
    setRefreshing(true);
    setError(null);
    
    try {
      // Get teams ordered by score in descending order (same as leaderboard)
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('team_name, score')
        .order('score', { ascending: false });
      
      if (teamsError) throw teamsError;

      // Find current team's data and position
      let currentPosition = 1;
      let lastScore = null;
      let foundTeam = false;

      for (let i = 0; i < teams.length; i++) {
        // Update position only when score changes
        if (teams[i].score !== lastScore) {
          currentPosition = i + 1;
          lastScore = teams[i].score;
        }

        if (teams[i].team_name === teamName) {
          setScore(teams[i].score || 0);
          setPosition(currentPosition);
          foundTeam = true;
          break;
        }
      }

      if (!foundTeam) {
        setScore(0);
        setPosition(0);
        setError('Team not found');
        setTimeout(() => navigate('/'), 3000);
      }
      
    } catch (error) {
      console.error('Error fetching team data:', error);
      setError('Unable to load your team information. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const startNewPrediction = () => {
    if (predictionAvailable) {
      navigate('/prediction', { state: { teamName } });
    } else {
      setError("Predictions are currently closed. Please wait for the admin to open them.");
      setTimeout(() => setError(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your team stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            IPL Prediction Game
          </h1>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="font-medium">{teamName}</span>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md flex items-start"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </motion.div>
        )}
        
        <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
          {/* Team Stats Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Team Stats</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={fetchTeamData}
                  disabled={refreshing}
                  className="text-white/80 hover:text-white"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center mb-6">
                <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="w-12 h-12 text-indigo-500" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-center text-gray-800 mb-6">
                {teamName}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-amber-100 to-amber-50 p-4 rounded-lg text-center">
                  <p className="text-amber-800 text-sm font-medium mb-1">Current Score</p>
                  <p className="text-3xl font-bold text-amber-900 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 mr-2 text-amber-500" />
                    {score}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-4 rounded-lg text-center">
                  <p className="text-purple-800 text-sm font-medium mb-1">Current Position</p>
                  <p className="text-3xl font-bold text-purple-900 flex items-center justify-center">
                    {position === 1 && <Crown className="w-6 h-6 mr-2 text-yellow-500" />}
                    {position === 2 && <Medal className="w-6 h-6 mr-2 text-gray-400" />}
                    {position === 3 && <Medal className="w-6 h-6 mr-2 text-amber-600" />}
                    {position > 3 && <Medal className="w-6 h-6 mr-2 text-purple-500" />}
                    {position}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Actions Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-6">Game Actions</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Ready to Predict?</h3>
                <p className="text-gray-600 mb-4">
                  Make your predictions for the current over and earn points by guessing correctly!
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startNewPrediction}
                  className={`w-full py-3 px-4 rounded-md flex items-center justify-center gap-2 shadow-md
                    ${predictionAvailable 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                >
                  {predictionAvailable ? (
                    <>
                      Start Prediction
                      <ArrowRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5" />
                      Predictions Closed
                    </>
                  )}
                </motion.button>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-700 mb-2">How Scoring Works</h3>
                <ul className="text-gray-600 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <span>Predict runs and wickets for each over</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <span>Earn points based on how close your prediction is</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <span>Check back here to see your updated score and position</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TeamDashboard;