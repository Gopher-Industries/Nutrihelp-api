const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function createNotification({ userId, type, content, status = 'unread' }) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{ user_id: userId, type, content, status }])
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create notification', error, { userId });
  }
}

async function getNotificationsByUserId(userId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load notifications', error, { userId });
  }
}

async function updateNotificationStatusById(id, status) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ status })
      .eq('simple_id', id)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to update notification status', error, { id });
  }
}

async function deleteNotificationById(id) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('simple_id', id)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to delete notification', error, { id });
  }
}

async function markAllUnreadNotificationsAsRead(userId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('user_id', userId)
      .eq('status', 'unread')
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to mark notifications as read', error, { userId });
  }
}

module.exports = {
  createNotification,
  deleteNotificationById,
  getNotificationsByUserId,
  markAllUnreadNotificationsAsRead,
  updateNotificationStatusById
};
