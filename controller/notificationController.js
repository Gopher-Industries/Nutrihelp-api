const notificationRepository = require('../repositories/notificationRepository');

// Create a new notification
exports.createNotification = async (req, res) => {
    try {
        const { user_id, type, content } = req.body;

        const data = await notificationRepository.createNotification({
            userId: user_id,
            type,
            content,
            status: 'unread'
        });

        res.status(201).json({ message: 'Notification created', notification: data });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'An error occurred while creating the notification' });
    }
};

// Get all notifications for a specific user by user_id
exports.getNotificationsByUserId = async (req, res) => {
    try {
        const { user_id } = req.params;

        const data = await notificationRepository.getNotificationsByUserId(user_id);

        if (data.length === 0) {
            return res.status(404).json({ message: 'No notifications found for this user' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Error retrieving notifications:', error);
        res.status(500).json({ error: 'An error occurred while retrieving notifications' });
    }
};

// Update a notification status for specific id
exports.updateNotificationStatusById = async (req, res) => {
    try {
        const { id } = req.params; // Extract id from the URL parameters
        const { status } = req.body; // Extract status from the request body

        const data = await notificationRepository.updateNotificationStatusById(id, status);

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

        const data = await notificationRepository.deleteNotificationById(id);

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
        
        const data = await notificationRepository.markAllUnreadNotificationsAsRead(user_id);

      
        if (data.length === 0) {
            return res.status(404).json({ message: 'No unread notifications found for this user' });
        }
        
        res.status(200).json({ message: 'All unread notifications marked as read', updatedNotifications: data });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({ error: 'An error occurred while marking notifications as read' });
    }
};
