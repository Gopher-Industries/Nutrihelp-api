import api from './client';

export const RecipeService = {
  getAll: (userId) => api.get(`/recipes?user_id=${userId}`),
  create: (recipeData) => api.post('/recipes', recipeData),
  delete: (recipeId) => api.delete(`/recipes/${recipeId}`)
};

export const AppointmentService = {
  getAll: (userId) => api.get(`/appointments?user_id=${userId}`),
  create: (appointmentData) => api.post('/appointments', appointmentData),
  delete: (id) => api.delete(`/appointments`, { data: { appointment_id: id } })
};

export const WaterService = {
  getStats: (userId) => api.get(`/water?user_id=${userId}`),
  logIntake: (data) => api.post('/water', data)
};

export const FoodService = {
  getMealPlan: (userId) => api.get(`/food/mealplan?user_id=${userId}`),
  lookupBarcode: (barcode) => api.get(`/food/nutrition/${barcode}`)
};
