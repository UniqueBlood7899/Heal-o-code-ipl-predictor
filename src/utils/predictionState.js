// Shared state for prediction status
let subscribers = [];
let isPredictionOpen = false;

export const predictionState = {
  // Get current prediction status
  getStatus: () => isPredictionOpen,
  
  // Update prediction status and notify subscribers
  setStatus: (status) => {
    isPredictionOpen = status;
    // Notify all subscribers
    subscribers.forEach(callback => callback(isPredictionOpen));
  },
  
  // Subscribe to prediction status changes
  subscribe: (callback) => {
    subscribers.push(callback);
    // Return unsubscribe function
    return () => {
      subscribers = subscribers.filter(cb => cb !== callback);
    };
  }
};

// Optional: Save status to localStorage to persist between page refreshes
try {
  const savedStatus = localStorage.getItem('predictionStatus');
  if (savedStatus !== null) {
    isPredictionOpen = JSON.parse(savedStatus);
  }
} catch (error) {
  console.error('Error reading prediction status from localStorage:', error);
}

// Save status changes to localStorage
predictionState.setStatus = (status) => {
  isPredictionOpen = status;
  try {
    localStorage.setItem('predictionStatus', JSON.stringify(status));
  } catch (error) {
    console.error('Error saving prediction status to localStorage:', error);
  }
  subscribers.forEach(callback => callback(isPredictionOpen));
};