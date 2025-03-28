import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Play, Pause, Plus, Minus, Save, Users, 
  Award, LogOut, Clock, RefreshCw, CheckCircle,
  XCircle, AlertTriangle, Loader2, Trophy
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { predictionState } from './utils/predictionState';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if admin is logged in
  useEffect(() => {
    if (!location.state || !location.state.admin) {
      navigate('/admin');
    }
  }, [location, navigate]);

  // Game state
  const [currentOver, setCurrentOver] = useState(1);
  const [isPredictionOpen, setIsPredictionOpen] = useState(predictionState.getStatus());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Actual results for the current over
  const [actualRuns, setActualRuns] = useState('');
  const [actualWickets, setActualWickets] = useState('');
  
  // Stats
  const [teamCount, setTeamCount] = useState(0);
  const [refreshingStats, setRefreshingStats] = useState(false);

  // Results for display
  // const [results, setResults] = useState([]);

  // Add to existing state declarations
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);

  // Fetch stats on load and periodically
  useEffect(() => {
    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Add this subscription to predictions table
  useEffect(() => {
    // Subscribe to predictions table changes
    const subscription = supabase
      .channel('predictions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictions'
        },
        () => {
          // Refresh stats when predictions change
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Add after other useEffect hooks
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Update the fetchStats function
  const fetchStats = async () => {
    setRefreshingStats(true);
    
    try {
      // Get all teams count
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('team_name');
      
      if (teamsError) throw teamsError;
      
      setTeamCount(teams ? teams.length : 0);
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setRefreshingStats(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      // Get teams ordered by score in descending order
      const { data: teams, error } = await supabase
        .from('teams')
        .select('team_name, score')
        .order('score', { ascending: false })
        .limit(50);
        
      if (error) throw error;

      // Create leaderboard data with positions
      let currentPosition = 1;
      let lastScore = null;
      
      const leaderboardData = teams.map((team) => {
        // Update position only when score changes
        if (team.score !== lastScore) {
          currentPosition = teams.indexOf(team) + 1;
          lastScore = team.score;
        }
        
        return {
          ...team,
          position: currentPosition
        };
      });
      
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const togglePredictionStatus = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Update the global prediction status
      predictionState.setStatus(!isPredictionOpen);
      
      // Update local state
      setIsPredictionOpen(!isPredictionOpen);
      
      // If closing predictions, reset all existing predictions and notify clients
      if (isPredictionOpen) {
        // Reset predictions
        const { error: resetError } = await supabase
          .from('predictions')
          .update({ runs: 0, wickets: 0 })
          .neq('team_name', '');
          
        if (resetError) throw resetError;

        // Broadcast reload event through Supabase realtime
        await supabase
          .from('predictions_status')
          .upsert({ 
            id: 1, 
            status: 'closed',
            timestamp: new Date().toISOString() 
          });
      }
      
      // Show success message
      const message = !isPredictionOpen ? 'Predictions are now open' : 'Predictions are now closed';
      setSuccess(message);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error toggling prediction status:', error);
      setError('Failed to update prediction status');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  
  const handleLogout = () => {
    navigate('/admin');
  };

  const submitActualResults = async () => {
    if (!actualRuns || !actualWickets) {
      setError('Please enter both runs and wickets');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Get all predictions to check against actual results
      const { data: predictions, error: predictionError } = await supabase
        .from('predictions')
        .select('*, teams!inner(score)')
        .not('runs', 'eq', 0);
        
      if (predictionError) throw predictionError;
  
      // Process each prediction
      for (const prediction of predictions) {
        let scoreChange = 0;

        // Calculate Mean Absolute Error for runs
        const actualRunsInt = parseInt(actualRuns);
        const predictedRuns = prediction.runs;
        const runMAE = Math.abs(actualRunsInt - predictedRuns);
        
        // Deduct MAE points for incorrect run predictions
        if (runMAE > 0) {
          scoreChange -= runMAE;
        }

        // Handle wicket predictions
        const actualWicketsInt = parseInt(actualWickets);
        const predictedWickets = prediction.wickets;
        
        // Add/deduct points based on wicket prediction
        if (predictedWickets === actualWicketsInt) {
          scoreChange += 10; // Correct wicket prediction
        } else {
          scoreChange -= 5; // Wrong wicket prediction
        }

        // Get current team's score
        const { data: currentTeam } = await supabase
          .from('teams')
          .select('score')
          .eq('team_name', prediction.team_name)
          .single();
          
        if (currentTeam) {
          // Calculate new score (ensure it doesn't go below 0)
          const newScore = Math.max(0, currentTeam.score + scoreChange);
          
          // Update team's score
          const { error: updateError } = await supabase
            .from('teams')
            .update({ score: newScore })
            .eq('team_name', prediction.team_name);
            
          if (updateError) throw updateError;
        }
      }
      
      // Reset all predictions to zero
      const { error: resetError } = await supabase
        .from('predictions')
        .update({ runs: 0, wickets: 0 })
        .neq('team_name', '');
        
      if (resetError) throw resetError;
      
      // Auto-close predictions
      predictionState.setStatus(false);
      setIsPredictionOpen(false);
      
      // Show success and reset form
      setSuccess('Results saved and scores updated based on prediction accuracy.');
      setActualRuns('');
      setActualWickets('');
      
      // Refresh stats and leaderboard
      fetchStats();
      fetchLeaderboard();
      
    } catch (error) {
      console.error('Error submitting results:', error);
      setError('Failed to submit results and update scores');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle input changes with validation
  const handleRunsChange = (e) => {
    const value = e.target.value;
    if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 36)) {
      setActualRuns(value);
    }
  };
  
  const handleWicketsChange = (e) => {
    const value = e.target.value;
    if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 4)) {
      setActualWickets(value);
    }
  };

  // If not authenticated, show loading while redirecting
  if (!location.state || !location.state.admin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-700 to-purple-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </motion.button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-6">
        {/* Status Messages */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex items-start"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </motion.div>
        )}
        
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 flex items-start"
          >
            <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
            <p className="text-green-800">{success}</p>
          </motion.div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Match Control and Leaderboard */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Match Control
              </h2>
              
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-gray-700">Current Over</h3>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-700">Prediction Status</h3>
                    <p className={`font-medium ${isPredictionOpen ? 'text-green-600' : 'text-red-600'}`}>
                      {isPredictionOpen ? 'Open for predictions' : 'Closed for predictions'}
                    </p>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePredictionStatus}
                    disabled={isProcessing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                      isProcessing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : isPredictionOpen
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isPredictionOpen ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                    {isPredictionOpen ? 'Stop Predictions' : 'Start Predictions'}
                  </motion.button>
                </div>
              </div>
              
              {/* Actual Results Form */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-800 mb-4">Enter Actual Results for Current Over</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label htmlFor="actual-runs" className="block text-sm font-medium text-gray-700 mb-1">
                      Actual Runs Scored
                    </label>
                    <input
                      id="actual-runs"
                      type="number"
                      min="0"
                      max="36"
                      value={actualRuns}
                      onChange={handleRunsChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter runs"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="actual-wickets" className="block text-sm font-medium text-gray-700 mb-1">
                      Actual Wickets Taken
                    </label>
                    <input
                      id="actual-wickets"
                      type="number"
                      min="0"
                      max="4"
                      value={actualWickets}
                      onChange={handleWicketsChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter wickets"
                    />
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={submitActualResults}
                  disabled={isProcessing}
                  className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-md ${
                    isProcessing
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Results
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Leaderboard */}
            <div className={`bg-white rounded-xl shadow-md p-6 ${
              isLeaderboardExpanded ? 'fixed inset-0 z-50 m-0 rounded-none' : ''
            }`}>
              <motion.div
                layout
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Leaderboard
                  </h2>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={fetchLeaderboard}
                      disabled={loadingLeaderboard}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingLeaderboard ? 'animate-spin' : ''}`} />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsLeaderboardExpanded(!isLeaderboardExpanded)}
                      className="ml-2 text-gray-600 hover:text-gray-800"
                    >
                      {isLeaderboardExpanded ? (
                        <XCircle className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full">
                          Expand
                        </span>
                      )}
                    </motion.button>
                  </div>
                </div>

                <motion.div 
                  layout
                  className={`overflow-y-auto ${
                    isLeaderboardExpanded ? 'flex-1' : 'max-h-96'
                  }`}
                >
                  {loadingLeaderboard ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Position</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Team Name</th>
                          {isLeaderboardExpanded && (
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Score</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {leaderboard.map((team) => (
                          <tr key={team.team_name} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                {team.position === 1 && <Trophy className="w-4 h-4 text-yellow-500" />}
                                {team.position === 2 && <Trophy className="w-4 h-4 text-gray-400" />}
                                {team.position === 3 && <Trophy className="w-4 h-4 text-amber-600" />}
                                <span className={`font-medium ${
                                  team.position <= 3 ? 'text-blue-600' : 'text-gray-900'
                                }`}>
                                  #{team.position}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-gray-900">{team.team_name}</td>
                            {isLeaderboardExpanded && (
                              <td className="px-4 py-2 text-gray-900">{team.score}</td>
                            )}
                          </tr>
                        ))}
                        {leaderboard.length === 0 && (
                          <tr>
                            <td colSpan={isLeaderboardExpanded ? 3 : 2} className="px-4 py-8 text-center text-gray-500">
                              No teams have participated yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </motion.div>
              </motion.div>
            </div>
          </div>
          
          {/* Right Column - Stats and Guide */}
          <div>
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Participation Stats
                </h2>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchStats}
                  disabled={refreshingStats}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshingStats ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Participating Teams</p>
                  <p className="text-2xl font-bold text-gray-800">{teamCount}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-indigo-700 rounded-xl shadow-md p-6 text-white">
              <h2 className="text-xl font-bold mb-4">Quick Guide</h2>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-white h-5 w-5 flex items-center justify-center text-indigo-700 mt-0.5 flex-shrink-0">
                    1
                  </div>
                  <span>Use the Match Control panel to manage the current over</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-white h-5 w-5 flex items-center justify-center text-indigo-700 mt-0.5 flex-shrink-0">
                    2
                  </div>
                  <span>Toggle predictions open/closed before and after each over</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-white h-5 w-5 flex items-center justify-center text-indigo-700 mt-0.5 flex-shrink-0">
                    3
                  </div>
                  <span>Enter actual runs and wickets after the over is complete</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;