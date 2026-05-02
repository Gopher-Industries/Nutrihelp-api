import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to handle the NutriHelp unified response envelope
apiClient.interceptors.response.use(
  (response) => {
    const { success, data, error, details } = response.data;

    if (success) {
      return data; // Return only the internal data object
    }

    // Handle case where success is false (Validation or Logic Error)
    const apiError = new Error(error || 'API Error');
    apiError.details = details;
    apiError.status = response.status;
    return Promise.reject(apiError);
  },
  (error) => {
    // Handle Network/HTTP Errors (500, 404, etc.)
    const message = error.response?.data?.error || error.message;
    const details = error.response?.data?.details;
    
    const enhancedError = new Error(message);
    enhancedError.status = error.response?.status;
    enhancedError.details = details;
    
    return Promise.reject(enhancedError);
  }
);

export default apiClient;
