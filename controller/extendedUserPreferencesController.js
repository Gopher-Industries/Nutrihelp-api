const fetchUserPreferences = require("../model/fetchUserPreferences");
const updateUserPreferences = require("../model/updateUserPreferences");
const supabase = require("../dbConnection.js");

/**
 * Get user preferences including notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserPreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        if (!userId) {
            return res.status(400).json({ 
                success: false,
                error: "User ID is required" 
            });
        }

        // Get existing user preferences
        const userPreferences = await fetchUserPreferences(userId);
        
        // Get notification preferences from users table
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('notification_preferences, language, theme, font_size')
            .eq('id', userId)
            .single();

        if (userError) {
            console.error('Error fetching user settings:', userError);
        }

        // Parse notification preferences
        let notificationPreferences = {};
        if (userData && userData.notification_preferences) {
            try {
                notificationPreferences = JSON.parse(userData.notification_preferences);
            } catch (parseError) {
                console.warn('Failed to parse notification preferences:', parseError);
                notificationPreferences = {
                    mealReminders: true,
                    waterReminders: true,
                    healthTips: true,
                    weeklyReports: false,
                    systemUpdates: true
                };
            }
        } else {
            // Default notification preferences
            notificationPreferences = {
                mealReminders: true,
                waterReminders: true,
                healthTips: true,
                weeklyReports: false,
                systemUpdates: true
            };
        }

        // Combine all preferences
        const response = {
            success: true,
            data: {
                ...userPreferences,
                notification_preferences: notificationPreferences,
                language: userData?.language || 'en',
                theme: userData?.theme || 'light',
                font_size: userData?.font_size || '16px'
            }
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

/**
 * Update user preferences including notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const postUserPreferences = async (req, res) => {
    try {
        const { user } = req.body;
        const userId = user.userId;

        if (!userId) {
            return res.status(400).json({ 
                success: false,
                error: "User ID is required" 
            });
        }

        // Update existing user preferences (dietary requirements, allergies, etc.)
        await updateUserPreferences(userId, req.body);

        // Update notification preferences and other settings in users table
        const updateData = {
            updated_at: new Date().toISOString()
        };

        // Handle notification preferences
        if (req.body.notification_preferences) {
            updateData.notification_preferences = JSON.stringify(req.body.notification_preferences);
        }

        // Handle other user settings
        if (req.body.language !== undefined) {
            updateData.language = req.body.language;
        }
        if (req.body.theme !== undefined) {
            updateData.theme = req.body.theme;
        }
        if (req.body.font_size !== undefined) {
            updateData.font_size = req.body.font_size;
        }

        // Update users table if there are settings to update
        if (Object.keys(updateData).length > 1) { // More than just updated_at
            const { error: updateError } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', userId);

            if (updateError) {
                console.error('Error updating user settings:', updateError);
                return res.status(500).json({ 
                    success: false,
                    error: "Failed to update user settings" 
                });
            }
        }

        return res.status(200).json({ 
            success: true,
            message: "User preferences updated successfully" 
        });
    } catch (error) {
        console.error('Error updating user preferences:', error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

/**
 * Get only notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false,
                error: "User ID is required" 
            });
        }

        const { data: userData, error } = await supabase
            .from('users')
            .select('notification_preferences')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching notification preferences:', error);
            return res.status(500).json({ 
                success: false,
                error: "Failed to fetch notification preferences" 
            });
        }

        let notificationPreferences = {};
        if (userData && userData.notification_preferences) {
            try {
                notificationPreferences = JSON.parse(userData.notification_preferences);
            } catch (parseError) {
                console.warn('Failed to parse notification preferences:', parseError);
                notificationPreferences = {
                    mealReminders: true,
                    waterReminders: true,
                    healthTips: true,
                    weeklyReports: false,
                    systemUpdates: true
                };
            }
        } else {
            // Default notification preferences
            notificationPreferences = {
                mealReminders: true,
                waterReminders: true,
                healthTips: true,
                weeklyReports: false,
                systemUpdates: true
            };
        }

        return res.status(200).json({
            success: true,
            data: notificationPreferences
        });
    } catch (error) {
        console.error('Error fetching notification preferences:', error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

/**
 * Update only notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { notification_preferences } = req.body;

        if (!userId) {
            return res.status(400).json({ 
                success: false,
                error: "User ID is required" 
            });
        }

        if (!notification_preferences) {
            return res.status(400).json({ 
                success: false,
                error: "Notification preferences are required" 
            });
        }

        const { error } = await supabase
            .from('users')
            .update({
                notification_preferences: JSON.stringify(notification_preferences),
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            console.error('Error updating notification preferences:', error);
            return res.status(500).json({ 
                success: false,
                error: "Failed to update notification preferences" 
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification preferences updated successfully"
        });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

module.exports = {
    getUserPreferences,
    postUserPreferences,
    getNotificationPreferences,
    updateNotificationPreferences
};
