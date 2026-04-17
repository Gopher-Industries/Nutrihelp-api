/**
 * API Service for managing user notification preferences
 * Integrates with the extended user preferences API
 */
import { API_BASE_URL } from '../config/apiConfig';

class NotificationPreferencesApi {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.defaultPreferences = {
            mealReminders: true,
            waterReminders: true,
            healthTips: true,
            weeklyReports: false,
            systemUpdates: true
        };
    }

    /**
     * Get authentication token from localStorage
     * @returns {string|null} JWT token or null if not found
     */
    getAuthToken() {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                return userData.token || null;
            } catch (error) {
                console.error('Error parsing user data:', error);
                return null;
            }
        }
        return null;
    }

    /**
     * Get current user ID from localStorage
     * @returns {string|null} User ID or null if not found
     */
    getCurrentUserId() {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                return userData.user_id || userData.id || null;
            } catch (error) {
                console.error('Error parsing user data:', error);
                return null;
            }
        }
        return null;
    }

    /**
     * Make HTTP request to API endpoint
     * @param {string} endpoint - API endpoint path
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} API response
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getAuthToken();
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    /**
     * Get user's notification preferences
     * @returns {Promise<Object>} Notification preferences object
     */
    async getNotificationPreferences() {
        try {
            const response = await this.request('/user/preferences/extended/notifications');
            
            if (response.success && response.data) {
                return response.data;
            }
            
            // Return default preferences if API fails
            return this.defaultPreferences;
        } catch (error) {
            console.error('Error fetching notification preferences:', error);
            
            // Try to get from localStorage as fallback
            const saved = localStorage.getItem('notificationPreferences');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (parseError) {
                    console.error('Error parsing saved preferences:', parseError);
                }
            }
            
            return this.defaultPreferences;
        }
    }

    /**
     * Update user's notification preferences
     * @param {Object} preferences - Notification preferences object
     * @returns {Promise<Object>} API response
     */
    async updateNotificationPreferences(preferences) {
        try {
            const response = await this.request('/user/preferences/extended/notifications', {
                method: 'PUT',
                body: JSON.stringify({
                    notification_preferences: preferences
                })
            });
            
            if (response.success) {
                // Save to localStorage as cache
                localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
                return response;
            }
            
            throw new Error(response.error || 'Failed to update notification preferences');
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            
            // Save to localStorage as fallback
            localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
            
            return {
                success: false,
                error: error.message,
                message: 'Preferences saved locally due to API error'
            };
        }
    }

    /**
     * Get all user preferences including notification preferences
     * @returns {Promise<Object>} All user preferences
     */
    async getAllUserPreferences() {
        try {
            const response = await this.request('/user/preferences/extended');
            
            if (response.success && response.data) {
                // Cache notification preferences
                if (response.data.notification_preferences) {
                    localStorage.setItem('notificationPreferences', 
                        JSON.stringify(response.data.notification_preferences));
                }
                
                return response.data;
            }
            
            throw new Error('Failed to fetch user preferences');
        } catch (error) {
            console.error('Error fetching all user preferences:', error);
            
            // Return cached data if available
            const cached = this.getCachedPreferences();
            return cached;
        }
    }

    /**
     * Update all user preferences including notification preferences
     * @param {Object} preferences - All user preferences object
     * @returns {Promise<Object>} API response
     */
    async updateAllUserPreferences(preferences) {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('User ID not found');
            }

            const response = await this.request('/user/preferences/extended', {
                method: 'POST',
                body: JSON.stringify({
                    user: { userId },
                    ...preferences
                })
            });
            
            if (response.success) {
                // Cache notification preferences
                if (preferences.notification_preferences) {
                    localStorage.setItem('notificationPreferences', 
                        JSON.stringify(preferences.notification_preferences));
                }
                
                return response;
            }
            
            throw new Error(response.error || 'Failed to update user preferences');
        } catch (error) {
            console.error('Error updating all user preferences:', error);
            
            // Save to localStorage as fallback
            if (preferences.notification_preferences) {
                localStorage.setItem('notificationPreferences', 
                    JSON.stringify(preferences.notification_preferences));
            }
            
            return {
                success: false,
                error: error.message,
                message: 'Preferences saved locally due to API error'
            };
        }
    }

    /**
     * Get cached preferences from localStorage
     * @returns {Object} Cached preferences or default preferences
     */
    getCachedPreferences() {
        const saved = localStorage.getItem('notificationPreferences');
        if (saved) {
            try {
                return {
                    notification_preferences: JSON.parse(saved),
                    language: localStorage.getItem('language') || 'en',
                    theme: localStorage.getItem('globalDarkMode') === 'true' ? 'dark' : 'light',
                    font_size: localStorage.getItem('fontSize') || '16px'
                };
            } catch (parseError) {
                console.error('Error parsing cached preferences:', parseError);
            }
        }
        
        return {
            notification_preferences: this.defaultPreferences,
            language: 'en',
            theme: 'light',
            font_size: '16px'
        };
    }

    /**
     * Test API connection
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testConnection() {
        try {
            await this.request('/user/preferences/extended/notifications');
            return true;
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    }

    /**
     * Reset notification preferences to default
     * @returns {Promise<Object>} API response
     */
    async resetToDefault() {
        return this.updateNotificationPreferences(this.defaultPreferences);
    }
}

// Export singleton instance
export default new NotificationPreferencesApi();
