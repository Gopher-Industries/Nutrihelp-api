const supabase = require('../dbConnection.js');
const {
    createErrorResponse,
    createSuccessResponse,
    formatNotifications
} = require('../services/apiResponseService');

// Create a new notification
exports.createNotification = async (req, res) => {
    try {
        const { user_id, type, content } = req.body;

        const { data, error } = await supabase
            .from('notifications')
            .insert([{ user_id, type, content, status: 'unread' }]);

        if (error) throw error;

        res.status(201).json({ message: 'Notification created', notification: data });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'An error occurred while creating the notification' });
    }
};

// Get all notifications for a specific user by user_id
exports.getNotificationsByUserId = async (req, res) => {
    try {
        const userId = req.params.user_id || req.user?.userId;
        const status = req.query.status;
        const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : null;

        let query = supabase
            .from('notifications')
            .select('simple_id, type, content, status, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        if (Number.isInteger(limit) && limit > 0) {
            query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) throw error;

        const { count, error: countError } = await supabase
            .from('notifications')
            .select('simple_id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'unread');

        if (countError) throw countError;

        res.status(200).json(createSuccessResponse({
            items: formatNotifications(data || [])
        }, {
            count: Array.isArray(data) ? data.length : 0,
            unreadCount: count || 0
        }));
    } catch (error) {
        console.error('Error retrieving notifications:', error);
        res.status(500).json(createErrorResponse('An error occurred while retrieving notifications', 'NOTIFICATIONS_LOAD_FAILED'));
    }
};

// Update a notification status for specific id
exports.updateNotificationStatusById = async (req, res) => {
    try {
        const { id } = req.params; // Extract id from the URL parameters
        const { status } = req.body; // Extract status from the request body

        const { data, error } = await supabase
            .from('notifications')
            .update({ status }) 
            .eq('simple_id', id)        // Only update the notification with the specific id
            

        if (error) {
            console.error('Error updating notification:', error);
            return res.status(500).json({ error: 'Failed to update notification' });
        }

        if (!data || data.length === 0) {
            // If no data is returned, the notification was not found
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.status(200).json({ message: 'Notification updated successfully', notification: data });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ error: 'An error occurred while updating the notification' });
    }
};


exports.deleteNotificationById = async (req, res) => {
    try {
        const { id } = req.params; 

        const { data, error } = await supabase
            .from('notifications')
            .delete()
            .eq('simple_id', id) // Only delete the notification with the specific id
           

        if (error) {
            console.error('Error deleting notification:', error);
            return res.status(500).json({ error: 'Failed to delete notification' });
        }

        if (!data || data.length === 0) {
            // If no data is returned, the notification was not found
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'An error occurred while deleting the notification' });
    }
};


// Mark all unread notifications as read for a specific user
exports.markAllUnreadNotificationsAsRead = async (req, res) => {
    try {
        
        const { user_id } = req.params;
        
        const { data, error } = await supabase
            .from('notifications')
            .update({ status: 'read' })
            .eq('user_id', user_id)
            .eq('status', 'unread'); 

    
        if (error) throw error;

      
        if (data.length === 0) {
            return res.status(404).json({ message: 'No unread notifications found for this user' });
        }
        
        res.status(200).json({ message: 'All unread notifications marked as read', updatedNotifications: data });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({ error: 'An error occurred while marking notifications as read' });
    }
};
