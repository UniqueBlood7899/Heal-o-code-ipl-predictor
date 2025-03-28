import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Welcome from './Welcome';
import AdminLogin from './Admin';
import PredictionPage from './Prediction';
import AdminDashboard from './AdminDashboard'; 
import TeamDashboard from './TeamDashBoard';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/prediction" element={<PredictionPage />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/team-dashboard" element={<TeamDashboard />} />
        {/* Add more routes as needed */}
      </Routes>
    </Router>
  );
};

export default App;