const supabase = require('../dbConnection.js');
const { shared } = require('../services');
const logger = require('../utils/logger');

const {
  createErrorResponse,
  createSuccessResponse,
  formatNotification,
  formatNotifications
} = shared.apiResponse;

function logAndRespondError(res, { logLabel, publicMessage, code, context = {}, statusCode = 500 }) {
  logger.error(logLabel, context);
  return res.status(statusCode).json(createErrorResponse(publicMessage, code));
}

function notFoundResponse(res, message, code = 'NOT_FOUND') {
  return res.status(404).json(createErrorResponse(message, code));
}

function mutationSuccess(res, statusCode, message, notification = null, meta = null) {
  const data = notification ? { notification: formatNotification(notification) } : null;
  return res.status(statusCode).json(createSuccessResponse(data, {
    message,
    ...(meta || {})
  }));
}

async function createNotification(req, res) {
  try {
    const { user_id, type, content } = req.body;

    const { data, error } = await supabase
      .from('notifications')
      .insert([{ user_id, type, content, status: 'unread' }])
      .select('simple_id, type, content, status, created_at')
      .single();

    if (error) {
      throw error;
    }

    return mutationSuccess(res, 201, 'Notification created', data);
  } catch (error) {
    return logAndRespondError(res, {
      logLabel: 'Error creating notification',
      publicMessage: 'An error occurred while creating the notification',
      code: 'NOTIFICATION_CREATE_FAILED',
      context: { error: error.message, user_id: req.body.user_id }
    });
  }
}

async function getNotificationsByUserId(req, res) {
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
    if (error) {
      throw error;
    }

    const { count, error: countError } = await supabase
      .from('notifications')
      .select('simple_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'unread');

    if (countError) {
      throw countError;
    }

    res.status(200).json(createSuccessResponse({
      items: formatNotifications(data || [])
    }, {
      count: Array.isArray(data) ? data.length : 0,
      unreadCount: count || 0
    }));
  } catch (error) {
    logger.error('Error retrieving notifications', {
      error: error.message,
      user_id: req.params.user_id || req.user?.userId
    });
    res.status(500).json(
      createErrorResponse(
        'An error occurred while retrieving notifications',
        'NOTIFICATIONS_LOAD_FAILED'
      )
    );
  }
}

async function updateNotificationStatusById(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('notifications')
      .update({ status })
      .eq('simple_id', id)
      .select('simple_id, type, content, status, created_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse(res, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
      }
      return logAndRespondError(res, {
        logLabel: 'Error updating notification',
        publicMessage: 'Failed to update notification',
        code: 'NOTIFICATION_UPDATE_FAILED',
        context: { error: error.message, notificationId: id }
      });
    }

    if (!data) {
      return notFoundResponse(res, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
    }

    return mutationSuccess(res, 200, 'Notification updated successfully', data);
  } catch (error) {
    return logAndRespondError(res, {
      logLabel: 'Error updating notification',
      publicMessage: 'An error occurred while updating the notification',
      code: 'NOTIFICATION_UPDATE_FAILED',
      context: { error: error.message, notificationId: req.params.id }
    });
  }
}

async function deleteNotificationById(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('simple_id', id)
      .select('simple_id, type, content, status, created_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse(res, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
      }
      return logAndRespondError(res, {
        logLabel: 'Error deleting notification',
        publicMessage: 'Failed to delete notification',
        code: 'NOTIFICATION_DELETE_FAILED',
        context: { error: error.message, notificationId: id }
      });
    }

    if (!data) {
      return notFoundResponse(res, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
    }

    return mutationSuccess(res, 200, 'Notification deleted successfully', data);
  } catch (error) {
    return logAndRespondError(res, {
      logLabel: 'Error deleting notification',
      publicMessage: 'An error occurred while deleting the notification',
      code: 'NOTIFICATION_DELETE_FAILED',
      context: { error: error.message, notificationId: req.params.id }
    });
  }
}

async function markAllUnreadNotificationsAsRead(req, res) {
  try {
    const { user_id } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('user_id', user_id)
      .eq('status', 'unread')
      .select('simple_id, type, content, status, created_at');

    if (error) {
      throw error;
    }

    if (data.length === 0) {
      return notFoundResponse(res, 'No unread notifications found for this user', 'NOTIFICATIONS_EMPTY');
    }

    return res.status(200).json(createSuccessResponse({
      items: formatNotifications(data || [])
    }, {
      message: 'All unread notifications marked as read',
      count: Array.isArray(data) ? data.length : 0
    }));
  } catch (error) {
    return logAndRespondError(res, {
      logLabel: 'Error marking notifications as read',
      publicMessage: 'An error occurred while marking notifications as read',
      code: 'NOTIFICATION_BULK_UPDATE_FAILED',
      context: { error: error.message, user_id: req.params.user_id }
    });
  }
}

module.exports = {
  createNotification,
  getNotificationsByUserId,
  updateNotificationStatusById,
  deleteNotificationById,
  markAllUnreadNotificationsAsRead,
};
